// LevelGoalTracker/js/storage.js
// Hybrid storage — localStorage for immediate reads, Supabase for persistence across devices.
// loadData / saveData / deleteGame are async. All other modules await them.

import {supabase} from '../../common/supabase.js';
import {getUser} from '../../common/auth.js';

// ── localStorage keys ──

export const STORAGE_KEY = 'bgt:level-goal-tracker:data';
export const STORAGE_SELECTED = 'bgt:level-goal-tracker:selected-game';

const TABLE = 'bgt_level_goal_tracker_games';

// ── Local helpers ──

function localLoad() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {games: []};
    } catch {
        return {games: []};
    }
}

function localSave(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── loadData ──
// Returns { games: [...] } from localStorage immediately.
// If online, fetches the game list from Supabase and merges any games that
// exist remotely but not locally — using a single batched query instead of
// one round trip per missing game.

export async function loadData() {
    const local = localLoad();
    const user = getUser();
    if (!user) return local;

    try {
        const {data: rows, error} = await supabase
            .from(TABLE)
            .select('id, name, updated_at')
            .eq('user_id', user.id);

        if (error || !rows) return local;

        // Identify which remote games are missing locally
        const missingIds = rows
            .filter(row => !local.games.find(g => g.id === row.id))
            .map(row => row.id);

        if (missingIds.length > 0) {
            // Fetch all missing games in one query
            const {data: fullRows} = await supabase
                .from(TABLE)
                .select('id, data, updated_at')
                .in('id', missingIds)
                .eq('user_id', user.id);

            if (fullRows) {
                for (const row of fullRows) {
                    if (row.data) {
                        local.games.push({...row.data, last_modified: row.updated_at});
                    }
                }
                localSave(local);
            }
        }
    } catch {
        // Network unavailable — return local silently
    }

    return local;
}

// ── loadGame ──
// Loads a single game's full data. Checks for collision between local and remote.
// Returns { game, collision } where collision is null or { localTime, remoteTime }.

export async function loadGame(gameId) {
    const local = localLoad();
    const localGame = local.games.find(g => g.id === gameId) || null;
    const user = getUser();

    if (!user || !localGame) return {game: localGame, collision: null};

    try {
        const {data: row, error} = await supabase
            .from(TABLE)
            .select('data, updated_at')
            .eq('id', gameId)
            .eq('user_id', user.id)
            .single();

        if (error || !row) return {game: localGame, collision: null};

        const localTime = localGame.last_modified ? new Date(localGame.last_modified) : null;
        const remoteTime = row.updated_at ? new Date(row.updated_at) : null;

        // No local timestamp — game was created before sync was introduced; push local up
        if (!localTime) {
            await saveGame(localGame);
            return {game: localGame, collision: null};
        }

        const diffMs = Math.abs(localTime - remoteTime);
        const THRESHOLD_MS = 5000;

        if (diffMs <= THRESHOLD_MS) {
            return {game: localGame, collision: null};
        }

        return {
            game: localGame,
            collision: {
                localTime: localTime.toISOString(),
                remoteTime: remoteTime.toISOString(),
                remoteData: row.data,
            },
        };
    } catch {
        return {game: localGame, collision: null};
    }
}

// ── saveData ──
// Writes the full games array to localStorage.
// Each game is upserted individually to Supabase.

export async function saveData(data) {
    localSave(data);
    const user = getUser();
    if (!user) return;

    try {
        for (const game of data.games) {
            await saveGame(game);
        }
    } catch {
        // Network unavailable — localStorage write already succeeded
    }
}

// ── saveGame ──
// Upserts a single game to Supabase and stamps last_modified locally.

export async function saveGame(game) {
    const user = getUser();
    if (!user) return;

    const now = new Date().toISOString();
    game.last_modified = now;

    try {
        await supabase.from(TABLE).upsert({
            id: game.id,
            user_id: user.id,
            name: game.name,
            data: game,
            updated_at: now,
        }, {onConflict: 'id'});
    } catch {
        // Network unavailable — swallow silently
    }

    // Persist the updated last_modified stamp locally
    const local = localLoad();
    const idx = local.games.findIndex(g => g.id === game.id);
    if (idx !== -1) {
        local.games[idx] = game;
        localSave(local);
    }
}

// ── resolveCollision ──

export async function resolveCollision(gameId, winner, remoteData) {
    const local = localLoad();
    const idx = local.games.findIndex(g => g.id === gameId);

    if (winner === 'remote' && remoteData) {
        if (idx !== -1) local.games[idx] = remoteData;
        else local.games.push(remoteData);
        localSave(local);
    } else if (winner === 'local' && idx !== -1) {
        await saveGame(local.games[idx]);
    }
}

// ── deleteGame ──

export async function deleteGame(gameId) {
    const local = localLoad();
    local.games = local.games.filter(g => g.id !== gameId);
    localSave(local);

    const user = getUser();
    if (!user) return;

    try {
        await supabase.from(TABLE).delete().eq('id', gameId).eq('user_id', user.id);
    } catch {
        // Network unavailable — local delete already succeeded
    }
}
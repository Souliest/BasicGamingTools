// LevelGoalTracker/js/storage.js
// Persists and retrieves the full games array via localStorage.

// ═══════════════════════════════════════════════
// Storage
// Thin synchronous wrapper — written so async can be dropped in later
// (e.g. Supabase) without touching other files.
// ═══════════════════════════════════════════════

export const STORAGE_KEY = 'bgt:level-goal-tracker:data';
export const STORAGE_SELECTED = 'bgt:level-goal-tracker:selected-game';

export function loadData() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {games: []};
    } catch {
        return {games: []};
    }
}

export function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
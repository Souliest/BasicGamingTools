// TrophyHunter/js/stats.js
// Pure stat computation for trophy progress — no DOM, no localStorage.
// Consistent with the stats.js pattern used in LevelGoalTracker and XpTracker.
// accumulateTrophyStats() extracts the shared accumulation loop used by both
// computeStats (multi-group) and computeGroupStats (single group).

// ═══════════════════════════════════════════════
// Stats — pure computed stats
// ═══════════════════════════════════════════════

// ── Trophy weights (Sony official point values) ──
const TROPHY_WEIGHTS = {bronze: 15, silver: 30, gold: 90, platinum: 0};

// ── Shared accumulator ────────────────────────────────────────────────────────
// Iterates a flat array of trophies and accumulates all counters used by both
// computeStats and computeGroupStats. Returns a plain counters object.

function accumulateTrophyStats(trophies, trophyState) {
    let total = 0, earned = 0;
    let weightedTotal = 0, weightedEarned = 0;
    let tierTotal = {platinum: 0, gold: 0, silver: 0, bronze: 0};
    let tierEarned = {platinum: 0, gold: 0, silver: 0, bronze: 0};
    let hasPlatinum = false;
    let platinumEarned = false;

    for (const trophy of trophies) {
        const state = trophyState[String(trophy.trophyId)] || {};
        if (state.orphaned) continue;

        const type = trophy.type || 'bronze';
        const weight = TROPHY_WEIGHTS[type] || 0;

        total++;
        tierTotal[type] = (tierTotal[type] || 0) + 1;

        if (type === 'platinum') {
            hasPlatinum = true;
            platinumEarned = !!state.earned;
        } else {
            weightedTotal += weight;
        }

        if (state.earned) {
            earned++;
            tierEarned[type] = (tierEarned[type] || 0) + 1;
            if (type !== 'platinum') weightedEarned += weight;
        }
    }

    const pct = weightedTotal > 0 ? Math.floor((weightedEarned / weightedTotal) * 100) : 0;
    return {total, earned, pct, tierTotal, tierEarned, hasPlatinum, platinumEarned};
}

// ── Public API ────────────────────────────────────────────────────────────────

export function computeStats(groups, trophyState) {
    const allTrophies = groups.flatMap(g => g.trophies);
    return accumulateTrophyStats(allTrophies, trophyState);
}

export function computeGroupStats(group, trophyState) {
    const acc = accumulateTrophyStats(group.trophies, trophyState);
    return {...acc, isComplete: acc.total > 0 && acc.earned === acc.total};
}

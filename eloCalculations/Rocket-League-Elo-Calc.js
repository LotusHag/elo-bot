const calculateEloChange = (playerElo, averageEnemyElo, actualScore, kFactor, matchImportance, winStreak, isWinner) => {
    const expectedScore = 1 / (1 + Math.pow(10, (averageEnemyElo - playerElo) / 400));
    const winStreakMultiplier = winStreak > 2 ? 1 + (Math.min(winStreak - 2, 3) * 0.035) : 1; // 3.5% per win streak above 2, capped at 5 games
    let eloChange = matchImportance * kFactor * winStreakMultiplier * (actualScore - expectedScore);

    // Apply the win/loss multiplier
    if (isWinner) {
        eloChange *= 1.3;
    } else {
        eloChange *= 0.85;
    }

    return eloChange;
};

const applyNormalDistribution = (value, scale) => {
    const cappedValue = Math.min(Math.max(value * scale, -0.75), 0.75);
    return 1 + cappedValue;
};

module.exports = {
    calculateEloChange,
    applyNormalDistribution
};

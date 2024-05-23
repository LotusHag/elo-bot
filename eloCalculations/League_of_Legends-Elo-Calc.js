const calculateEloChange = (playerElo, averageEnemyElo, actualScore, kFactor, matchImportance, winStreak, isWinner) => {
    const expectedScore = 1 / (1 + Math.pow(10, (averageEnemyElo - playerElo) / 400));
    const winStreakMultiplier = winStreak > 2 ? 1 + (Math.min(winStreak - 2, 3) * 0.035) : 1;
    let eloChange = matchImportance * kFactor * winStreakMultiplier * (actualScore - expectedScore);

    if (isWinner) {
        eloChange *= 1.3;
    } else {
        eloChange *= 0.85;
    }

    return eloChange;
};

const applyNormalDistribution = (eloChange, teamEloDifference, playerEloDiff) => {
    const scaleFactor = 0.0025;
    const teamScale = Math.min(Math.max(teamEloDifference * scaleFactor, -0.75), 0.75);
    const playerScale = Math.min(Math.max(playerEloDiff * scaleFactor, -0.75), 0.75);
    return eloChange * (1 + teamScale + playerScale);
};

module.exports = { calculateEloChange, applyNormalDistribution };

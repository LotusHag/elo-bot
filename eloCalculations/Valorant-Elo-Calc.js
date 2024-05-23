// Valorant-Elo-Calc.js
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

const updatePlayerStats = async (player, isWinner, averageEnemyElo, averageGameElo, teamEloDifference, winStreak, matchImportance) => {
    const actualScore = isWinner ? 1 : 0;

    const totalGames = player.wins + player.losses;
    const baseKFactor = 24 * 1.33;
    const initialGameMultiplier = totalGames < 10 ? 1.5 : 1;
    const adjustedKFactor = baseKFactor * initialGameMultiplier;

    let eloChange = calculateEloChange(player.elo, averageEnemyElo, actualScore, adjustedKFactor, matchImportance, winStreak, isWinner);

    const eloDifferenceScale = 0.0025;
    const teamDifferenceScale = 0.0025;

    const playerEloScaleFactor = applyNormalDistribution(player.elo - averageGameElo, eloDifferenceScale);
    const teamEloScaleFactor = applyNormalDistribution(teamEloDifference, teamDifferenceScale);

    eloChange *= playerEloScaleFactor;
    eloChange *= teamEloScaleFactor;

    if (isWinner) {
        player.wins += 1;
        player.elo += eloChange;
        player.winStreak += 1;
    } else {
        player.losses += 1;
        player.elo += eloChange;
        player.winStreak = 0;
    }

    await player.save();
};

module.exports = { calculateEloChange, applyNormalDistribution, updatePlayerStats };

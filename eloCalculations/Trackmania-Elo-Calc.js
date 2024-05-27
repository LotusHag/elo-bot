const TrackmaniaRun = require('../models/trackmaniaRun');

const calculateEloChange = (playerElo, actualScore, kFactor) => {
    // Custom Elo calculation for Trackmania (if needed)
    const expectedScore = 1 / (1 + Math.pow(10, (playerElo - actualScore) / 400));
    let eloChange = kFactor * (actualScore - expectedScore);
    return eloChange;
};

const updatePlayerStats = async (player, newTime, kFactor) => {
    // Update player stats based on the new time (if needed)
    const playerElo = player.elo;
    const eloChange = calculateEloChange(playerElo, newTime, kFactor);
    player.elo += eloChange;
    await player.save();
};

module.exports = { updatePlayerStats };

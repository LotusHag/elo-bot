const TrackmaniaMap = require('../models/trackmaniaMap');
const TrackmaniaRun = require('../models/trackmaniaRun');

const calculateElo = async (mapId) => {
    const runs = await TrackmaniaRun.find({ mapId }).sort({ time: 1 }).limit(5);
    const points = [500, 250, 125, 75, 50];
    let index = 0;

    for (let run of runs) {
        const player = await PlayerTrackmania.findById(run.playerId);
        player.elo = player.elo - player.maps[mapId] + points[index];
        player.maps[mapId] = points[index];
        await player.save();
        index++;
    }
};

module.exports = { calculateElo };

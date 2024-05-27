const express = require('express');
const router = express.Router();
const TrackmaniaMap = require('../models/trackmaniaMap');
const TrackmaniaRun = require('../models/trackmaniaRun');
const Player = require('../models/player');
const { ensureAuthenticated, ensureAdmin } = require('../config/auth');

router.get('/leaderboard', ensureAuthenticated, async (req, res) => {
    const maps = await TrackmaniaMap.find({ status: 'active' }).exec();
    const leaderboards = {};

    for (const map of maps) {
        const runs = await TrackmaniaRun.find({ map: map._id, verified: true })
            .populate('player')
            .sort({ time: 1 })
            .limit(10)
            .exec();
        leaderboards[map.name] = runs;
    }

    res.render('game-leaderboard-trackmania', { maps, leaderboards });
});

router.get('/input', ensureAuthenticated, async (req, res) => {
    const maps = await TrackmaniaMap.find({ status: 'active' }).exec();
    res.render('game-input-trackmania', { maps });
});

router.post('/input', ensureAuthenticated, async (req, res) => {
    const { map, minutes, seconds, milliseconds } = req.body;
    const time = (parseInt(minutes) * 60 + parseInt(seconds)) * 1000 + parseInt(milliseconds);
    const player = await Player.findById(req.user._id).exec();

    const newRun = new TrackmaniaRun({
        player: player._id,
        map,
        time,
        verified: false
    });

    await newRun.save();
    res.redirect('/trackmania/leaderboard');
});

router.get('/verify', ensureAdmin, async (req, res) => {
    const unverifiedRuns = await TrackmaniaRun.find({ verified: false }).populate('player map').exec();
    res.render('verify-trackmania', { unverifiedRuns });
});

router.post('/verify/:runId', ensureAdmin, async (req, res) => {
    const runId = req.params.runId;
    const action = req.body.action;

    if (action === 'approve') {
        await TrackmaniaRun.findByIdAndUpdate(runId, { verified: true }).exec();
    } else if (action === 'delete') {
        await TrackmaniaRun.findByIdAndDelete(runId).exec();
    }

    res.redirect('/trackmania/verify');
});

module.exports = router;

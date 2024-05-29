const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TrackmaniaRun = require('../models/trackmaniaRun');
const PlayerTrackmania = require('../models/playerTrackmania');
const TrackmaniaMap = require('../models/trackmaniaMap');

// Function to find or create a player
async function findOrCreatePlayer(playerName) {
    let player = await PlayerTrackmania.findOne({ name: playerName.toLowerCase() }).exec();
    if (!player) {
        player = new PlayerTrackmania({ name: playerName.toLowerCase() });
        await player.save();
    }
    return player;
}

router.get('/leaderboard/:mapId/:type', async (req, res) => {
    try {
        const mapId = req.params.mapId;
        const type = req.params.type;

        let filter = { map: mapId };
        if (type === 'verified') {
            filter.verified = true;
        }

        const runs = await TrackmaniaRun.find(filter)
            .populate('player')
            .sort({ time: 1 })
            .exec();

        let leaderboard = [];
        if (type === 'default') {
            const playerBestRuns = new Map();
            for (let run of runs) {
                if (run.verified && run.player && (!playerBestRuns.has(run.player._id.toString()) || run.time < playerBestRuns.get(run.player._id.toString()).time)) {
                    playerBestRuns.set(run.player._id.toString(), run);
                }
            }
            leaderboard = Array.from(playerBestRuns.values()).map(run => ({
                playerName: run.player ? run.player.name : 'Unknown Player',
                time: run.time,
                isApproved: run.verified
            }));
        } else {
            leaderboard = runs.map(run => ({
                playerName: run.player ? run.player.name : 'Unknown Player',
                time: run.time,
                isApproved: run.verified
            }));
        }

        res.json(leaderboard);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/total-elo-leaderboard', async (req, res) => {
    try {
        const players = await PlayerTrackmania.find();

        const playerEloMap = new Map();
        for (let player of players) {
            let totalElo = 0;
            const runs = await TrackmaniaRun.find({ player: player._id, verified: true });

            for (let run of runs) {
                totalElo += 1000; // Assuming 1000 points per run as a placeholder
            }

            playerEloMap.set(player._id.toString(), {
                name: player.name,
                totalElo: totalElo
            });
        }

        const totalEloLeaderboard = Array.from(playerEloMap.values()).sort((a, b) => b.totalElo - a.totalElo);

        res.json(totalEloLeaderboard);
    } catch (err) {
        console.error('Error fetching total ELO leaderboard:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/verify-runs', async (req, res) => {
    try {
        const runs = await TrackmaniaRun.find({ verified: false }).populate('player').populate('map').exec();
        res.render('verify-runs', { runs });
    } catch (err) {
        console.error('Error fetching runs for verification:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/verify-runs/approve/:id', async (req, res) => {
    try {
        const runId = req.params.id;
        await TrackmaniaRun.findByIdAndUpdate(runId, { verified: true });
        res.redirect('/trackmania/verify-runs');
    } catch (err) {
        console.error('Error approving run:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/verify-runs/delete/:id', async (req, res) => {
    try {
        const runId = req.params.id;
        await TrackmaniaRun.findByIdAndDelete(runId);
        res.redirect('/trackmania/verify-runs');
    } catch (err) {
        console.error('Error deleting run:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Endpoint for submitting a Trackmania run
router.post('/submit-run', async (req, res) => {
    try {
        const { player, map, minutes, seconds, milliseconds } = req.body;

        // Calculate the total time in milliseconds
        const time = (parseInt(minutes) * 60000) + (parseInt(seconds) * 1000) + parseInt(milliseconds);

        // Find or create the player
        const playerDoc = await findOrCreatePlayer(player);

        // Create and save the new run
        const newRun = new TrackmaniaRun({
            player: playerDoc._id,
            map: map,
            time: time,
            verified: false
        });

        await newRun.save();

        res.redirect('/trackmania/verify-runs');
    } catch (err) {
        console.error('Error submitting run:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;

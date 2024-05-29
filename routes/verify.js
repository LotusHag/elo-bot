const express = require('express');
const router = express.Router();
const TrackmaniaRun = require('../models/trackmaniaRun');
const PlayerTrackmania = require('../models/playerTrackmania');
const TrackmaniaMap = require('../models/trackmaniaMap');

router.get('/', async (req, res) => {
    try {
        const runs = await TrackmaniaRun.find({ verified: false })
            .populate('player')
            .populate('map')
            .exec();

        res.render('verify-runs', { runs });
    } catch (err) {
        console.error('Error fetching runs to verify:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/:id/approve', async (req, res) => {
    try {
        await TrackmaniaRun.findByIdAndUpdate(req.params.id, { verified: true });
        res.redirect('/trackmania/verify');
    } catch (err) {
        console.error('Error approving run:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/:id/delete', async (req, res) => {
    try {
        await TrackmaniaRun.findByIdAndDelete(req.params.id);
        res.redirect('/trackmania/verify');
    } catch (err) {
        console.error('Error deleting run:', err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;

// routes/verify.js
const express = require('express');
const router = express.Router();
const TrackmaniaRun = require('../models/trackmaniaRun');
const { ensureAuthenticated, ensureAdmin } = require('../config/auth');

// Load the verification page
router.get('/', ensureAuthenticated, async (req, res) => {
    const unverifiedRuns = await TrackmaniaRun.find({ verified: false }).populate('player').populate('map').exec();
    res.render('verify-trackmania', { unverifiedRuns });
});

// Approve or delete a run
router.post('/:runId', ensureAdmin, async (req, res) => {
    const runId = req.params.runId;
    const { action } = req.body;

    if (action === 'approve') {
        await TrackmaniaRun.findByIdAndUpdate(runId, { verified: true });
    } else if (action === 'delete') {
        await TrackmaniaRun.findByIdAndDelete(runId);
    }

    res.redirect('/verify');
});

module.exports = router;

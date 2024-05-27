const express = require('express');
const router = express.Router();
const PlayerTrackmania = require('../models/playerTrackmania');
const { ensureAuthenticated } = require('../config/auth');

// Load the verification page
router.get('/', ensureAuthenticated, async (req, res) => {
    const unverifiedRuns = await PlayerTrackmania.find({ isApproved: false }).populate('player').populate('map').exec();
    res.render('verify-runs', { unverifiedRuns });
});

// Approve a run
router.post('/approve/:runId', ensureAuthenticated, async (req, res) => {
    const runId = req.params.runId;
    try {
        await PlayerTrackmania.findByIdAndUpdate(runId, { isApproved: true });
        res.redirect('/verify');
    } catch (err) {
        console.error('Error approving run:', err);
        res.status(500).send('Error approving run');
    }
});

// Delete a run
router.post('/delete/:runId', ensureAuthenticated, async (req, res) => {
    const runId = req.params.runId;
    try {
        await PlayerTrackmania.findByIdAndDelete(runId);
        res.redirect('/verify');
    } catch (err) {
        console.error('Error deleting run:', err);
        res.status(500).send('Error deleting run');
    }
});

module.exports = router;

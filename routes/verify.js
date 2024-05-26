const express = require('express');
const router = express.Router();
const { ensureAdmin } = require('../config/auth');
const Speedrun = require('../models/speedrun');

router.get('/verify', ensureAdmin, async (req, res) => {
    const unverifiedRuns = await Speedrun.find({ verified: false }).populate('player map').exec();
    res.render('verify-runs', { unverifiedRuns });
});

router.post('/verify', ensureAdmin, async (req, res) => {
    const { action, runId } = req.body;

    if (action === 'approve') {
        await Speedrun.findByIdAndUpdate(runId, { verified: true }).exec();
    } else if (action === 'delete') {
        await Speedrun.findByIdAndDelete(runId).exec();
    }

    res.redirect('/verify');
});

module.exports = router;

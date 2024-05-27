const express = require('express');
const router = express.Router();
const TrackmaniaMap = require('../models/trackmaniaMap');
const { ensureAuthenticated } = require('../config/auth');

// Route to display the form to add a new Trackmania map
router.get('/add', ensureAuthenticated, (req, res) => {
    res.render('add-map');
});

// Route to handle the submission of the new Trackmania map
router.post('/add', ensureAuthenticated, async (req, res) => {
    const { name, status } = req.body;
    const newMap = new TrackmaniaMap({ name, status });
    try {
        await newMap.save();
        res.redirect('/maps/add');
    } catch (err) {
        console.error('Error adding map:', err);
        res.status(500).send('Error adding map');
    }
});

module.exports = router;

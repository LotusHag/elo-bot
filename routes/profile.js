const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { ensureAuthenticated } = require('../config/auth');

router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('playerIds').exec();
        res.render('profile', { user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { ensureAdmin } = require('../config/auth');

// File made in preperation for the fact that we might need admins to verify some inputted data

router.get('/verify', ensureAdmin, (req, res) => {
    res.send('No content to verify');
});

router.post('/verify', ensureAdmin, (req, res) => {
    res.send('No content to verify');
});

module.exports = router;

// routes/index.js
const express = require('express');
const router = express.Router();
const Game = require('../models/game');

router.get('/', async (req, res) => {
    try {
        const games = await Game.find().exec();
        res.render('index', { games, user: req.user });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;

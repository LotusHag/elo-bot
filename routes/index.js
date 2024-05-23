const express = require('express');
const router = express.Router();
const Game = require('../models/game');

router.get('/', async (req, res) => {
    const games = await Game.find().exec();
    res.render('index', { games });
});

module.exports = router;

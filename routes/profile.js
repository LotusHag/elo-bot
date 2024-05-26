const express = require('express');
const router = express.Router();
const User = require('../models/user');
const PlayerLOL = require('../models/playerLOL');
const PlayerValo = require('../models/playerValo');
const PlayerRL = require('../models/playerRL');
const { ensureAuthenticated } = require('../config/auth');

const playerModels = {
    'PlayerLOL': PlayerLOL,
    'PlayerValo': PlayerValo,
    'PlayerRL': PlayerRL
};

router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).exec();

        const players = [];
        for (const playerId of user.playerIds) {
            const playerModel = playerModels[user.playerModel];
            const player = await playerModel.findById(playerId).exec();
            if (player) {
                players.push(player);
            }
        }

        res.render('profile', { user, players });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

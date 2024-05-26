const express = require('express');
const router = express.Router();
const Game = require('../models/game');
const PlayerLOL = require('../models/playerLOL');
const PlayerValo = require('../models/playerValo');
const PlayerRL = require('../models/playerRL');
const { ensureAuthenticated } = require('../config/auth');

router.get('/setup', ensureAuthenticated, async (req, res) => {
    const games = await Game.find().exec();
    res.render('custom-game-setup', { games });
});

router.get('/setup/:gameId', ensureAuthenticated, async (req, res) => {
    const game = await Game.findById(req.params.gameId).exec();
    if (!game) return res.status(404).send('Game not found');

    if (game.name === 'League of Legends') {
        res.render('custom-game-setup-lol', { game });
    } else {
        res.render('custom-game-setup-default', { game });
    }
});

router.post('/setup/:gameId', ensureAuthenticated, async (req, res) => {
    const gameId = req.params.gameId;
    const game = await Game.findById(gameId).exec();
    if (!game) return res.status(404).send('Game not found');

    let PlayerModel;
    switch (game.name) {
        case 'League of Legends':
            PlayerModel = PlayerLOL;
            break;
        case 'Rocket League':
            PlayerModel = PlayerRL;
            break;
        case 'Valorant':
            PlayerModel = PlayerValo;
            break;
        default:
            return res.status(500).send('Unknown game');
    }

    const { blueTeam, redTeam, roles, winner } = req.body;

    const processTeam = async (team, roles = null) => {
        let teamDocs = await PlayerModel.find({ name: { $in: team.map(player => player.name) }, game: gameId }).exec();
        const existingPlayers = new Set(teamDocs.map(player => player.name));

        for (const player of team) {
            if (!existingPlayers.has(player.name)) {
                let newPlayer = new PlayerModel({ name: player.name, game: gameId });
                if (roles) newPlayer.roles = roles[player.name] || [];
                await newPlayer.save();
                teamDocs.push(newPlayer);
            }
        }

        return teamDocs;
    };

    const blueTeamDocs = await processTeam(blueTeam, roles?.blueTeam);
    const redTeamDocs = await processTeam(redTeam, roles?.redTeam);
    res.redirect(`/games/${gameId}`);
});

module.exports = router;

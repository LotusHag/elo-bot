const express = require('express');
const router = express.Router();
const Game = require('../models/game');
const Player = require('../models/player');
const Match = require('../models/match');
const Trackmania = require('../models/trackmania');
const { ensureAuthenticated } = require('../config/auth');

router.get('/:gameId', ensureAuthenticated, async (req, res) => {
    const gameId = req.params.gameId;
    const game = await Game.findById(gameId).exec();
    if (game.name === 'Trackmania') {
        const records = await Trackmania.find().populate('player').sort({ time: 1 }).exec();
        res.render('trackmania-leaderboard', { game, records });
    } else {
        const players = await Player.find({ game: gameId }).sort({ elo: -1 }).exec();
        res.render('game-leaderboard', { game, players });
    }
});

router.get('/:gameId/input', ensureAuthenticated, async (req, res) => {
    const game = await Game.findById(req.params.gameId).exec();
    if (game.name === 'Trackmania') {
        res.render('game-input-trackmania', { game });
    } else if (game.name === 'Smash') {
        res.render('game-input-1v1', { game });
    } else if (game.name === 'Rocket League') {
        res.render('game-input-3v3', { game });
    } else {
        res.render('game-input-5v5', { game });
    }
});

router.post('/:gameId/input', ensureAuthenticated, async (req, res) => {
    const gameId = req.params.gameId;
    const game = await Game.findById(gameId).exec();

    if (game.name === 'Trackmania') {
        const { player, map, time } = req.body;
        let playerDoc = await Player.findOne({ name: player, game: gameId }).exec();
        if (!playerDoc) {
            playerDoc = new Player({ name: player, game: gameId });
            await playerDoc.save();
        }
        const record = new Trackmania({ player: playerDoc._id, map, time });
        await record.save();
    } else if (game.name === 'Smash') {
        const { player1, player2, winner } = req.body;
        let player1Doc = await Player.findOne({ name: player1, game: gameId }).exec();
        let player2Doc = await Player.findOne({ name: player2, game: gameId }).exec();

        if (!player1Doc) player1Doc = new Player({ name: player1, game: gameId });
        if (!player2Doc) player2Doc = new Player({ name: player2, game: gameId });

        if (winner === 'player1') {
            player1Doc.elo = calculateElo(player1Doc.elo, player2Doc.elo, 1);
            player2Doc.elo = calculateElo(player2Doc.elo, player1Doc.elo, 0);
        } else {
            player1Doc.elo = calculateElo(player1Doc.elo, player2Doc.elo, 0);
            player2Doc.elo = calculateElo(player2Doc.elo, player1Doc.elo, 1);
        }

        await player1Doc.save();
        await player2Doc.save();
    } else {
        const { blueTeam, redTeam, winner } = req.body;
        const blueTeamNames = blueTeam.map(name => name.trim());
        const redTeamNames = redTeam.map(name => name.trim());

        let blueTeamDocs = await Player.find({ name: { $in: blueTeamNames }, game: gameId }).exec();
        let redTeamDocs = await Player.find({ name: { $in: redTeamNames }, game: gameId }).exec();

        for (let playerName of blueTeamNames) {
            if (!blueTeamDocs.some(p => p.name === playerName)) {
                const newPlayer = new Player({ name: playerName, game: gameId });
                await newPlayer.save();
                blueTeamDocs.push(newPlayer);
            }
        }

        for (let playerName of redTeamNames) {
            if (!redTeamDocs.some(p => p.name === playerName)) {
                const newPlayer = new Player({ name: playerName, game: gameId });
                await newPlayer.save();
                redTeamDocs.push(newPlayer);
            }
        }

        if (game.name === 'Rocket League') {
            // Custom logic for Rocket League (3v3)
            updateEloForTeamMatch(blueTeamDocs, redTeamDocs, winner === 'blue');
        } else {
            // Generic logic for 5v5 games
            updateEloForTeamMatch(blueTeamDocs, redTeamDocs, winner === 'blue');
        }

        // Save match results
        const match = new Match({
            blueTeam: blueTeamDocs.map(player => player._id),
            redTeam: redTeamDocs.map(player => player._id),
            winner,
            type: game.name === 'Rocket League' ? '3v3' : '5v5'
        });
        await match.save();
    }

    res.redirect(`/games/${gameId}`);
});

function updateEloForTeamMatch(blueTeamDocs, redTeamDocs, blueWins) {
    const blueTeamElo = averageElo(blueTeamDocs);
    const redTeamElo = averageElo(redTeamDocs);
    const kFactor = 32;
    const score = blueWins ? 1 : 0;

    blueTeamDocs.forEach(player => {
        player.elo = calculateElo(player.elo, redTeamElo, score);
        if (blueWins) {
            player.wins += 1;
            player.winStreak += 1;
        } else {
            player.losses += 1;
            player.winStreak = 0;
        }
        player.save();
    });

    redTeamDocs.forEach(player => {
        player.elo = calculateElo(player.elo, blueTeamElo, 1 - score);
        if (!blueWins) {
            player.wins += 1;
            player.winStreak += 1;
        } else {
            player.losses += 1;
            player.winStreak = 0;
        }
        player.save();
    });
}

function averageElo(teamDocs) {
    return teamDocs.reduce((sum, player) => sum + player.elo, 0) / teamDocs.length;
}

function calculateElo(playerElo, opponentElo, score) {
    const kFactor = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    return playerElo + kFactor * (score - expectedScore);
}

module.exports = router;

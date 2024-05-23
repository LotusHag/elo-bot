const express = require('express');
const router = express.Router();
const Game = require('../models/game');
const Player = require('../models/player');
const Match = require('../models/match');
const Speedrun = require('../models/speedrun');
const { ensureAuthenticated } = require('../config/auth');
const path = require('path');

// Utility function to load the correct Elo calculation module
function loadEloCalculationModule(gameName) {
    const gameNameFormatted = gameName.replace(/ /g, '_'); // Replace spaces with underscores
    try {
        const filePath = path.join(__dirname, `../eloCalculations/${gameNameFormatted}-Elo-Calc.js`);
        return require(filePath);
    } catch (error) {
        console.error(`Error loading Elo calculation module for game: ${gameName}`, error);
        return null;
    }
}

router.get('/:gameId', ensureAuthenticated, async (req, res) => {
    const gameId = req.params.gameId;
    const game = await Game.findById(gameId).exec();
    if (game.name === 'Trackmania' || game.category === 'Speedrun') {
        const records = await Speedrun.find().populate('player').sort({ time: 1 }).exec();
        res.render('game-leaderboard-speedrunning', { game, records });
    } else {
        const players = await Player.find({ game: gameId }).sort({ elo: -1 }).exec();
        res.render('game-leaderboard', { game, players, previousLeaderboard: [] });
    }
});

router.get('/:gameId/input', ensureAuthenticated, async (req, res) => {
    const game = await Game.findById(req.params.gameId).exec();
    if (game.name === 'Trackmania' || game.category === 'Speedrun') {
        res.render('game-input-speedrun', { game });
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
    const eloCalcModule = loadEloCalculationModule(game.name);
    if (!eloCalcModule) {
        console.error(`Elo calculation module not found for game: ${game.name}`);
        return res.status(500).send('Elo calculation module not found');
    }
    const { calculateEloChange, applyNormalDistribution } = eloCalcModule;

    if (game.name === 'Trackmania' || game.category === 'Speedrun') {
        const { player, gameCategory, map, time } = req.body;
        let playerDoc = await Player.findOne({ name: player, game: gameId }).exec();
        if (!playerDoc) {
            playerDoc = new Player({ name: player, game: gameId });
            await playerDoc.save();
        }
        const record = new Speedrun({ player: playerDoc._id, gameCategory, map, time });
        await record.save();
    } else if (game.name === 'Smash') {
        const { player1, player2, winner } = req.body;
        let player1Doc = await Player.findOne({ name: player1, game: gameId }).exec();
        let player2Doc = await Player.findOne({ name: player2, game: gameId }).exec();

        if (!player1Doc) player1Doc = new Player({ name: player1, game: gameId });
        if (!player2Doc) player2Doc = new Player({ name: player2, game: gameId });

        if (winner === 'player1') {
            player1Doc.elo = calculateEloChange(player1Doc.elo, player2Doc.elo, 1, 24, 1, player1Doc.winStreak, true);
            player2Doc.elo = calculateEloChange(player2Doc.elo, player1Doc.elo, 0, 24, 1, player2Doc.winStreak, false);
        } else {
            player1Doc.elo = calculateEloChange(player1Doc.elo, player2Doc.elo, 0, 24, 1, player1Doc.winStreak, false);
            player2Doc.elo = calculateEloChange(player2Doc.elo, player1Doc.elo, 1, 24, 1, player2Doc.winStreak, true);
        }

        console.log(`Player 1 Elo: ${player1Doc.elo}`);
        console.log(`Player 2 Elo: ${player2Doc.elo}`);

        await player1Doc.save();
        await player2Doc.save();
    } else {
        const { blueTeam, redTeam, winner } = req.body;
        const blueTeamNames = blueTeam.map(name => name.trim());
        const redTeamNames = redTeam.map(name => name.trim());

        let blueTeamDocs = await Player.find({ name: { $in: blueTeamNames }, game: gameId }).exec();
        let redTeamDocs = await Player.find({ name: { $in: redTeamNames }, game: gameId }).exec();

        for (let playerName of blueTeamNames) {
            let playerDoc = blueTeamDocs.find(p => p.name === playerName);
            if (!playerDoc) {
                playerDoc = new Player({ name: playerName, game: gameId });
                await playerDoc.save();
                blueTeamDocs.push(playerDoc);
            }
        }

        for (let playerName of redTeamNames) {
            let playerDoc = redTeamDocs.find(p => p.name === playerName);
            if (!playerDoc) {
                playerDoc = new Player({ name: playerName, game: gameId });
                await playerDoc.save();
                redTeamDocs.push(playerDoc);
            }
        }

        const averageBlueTeamElo = blueTeamDocs.reduce((sum, player) => sum + player.elo, 0) / blueTeamDocs.length;
        const averageRedTeamElo = redTeamDocs.reduce((sum, player) => sum + player.elo, 0) / redTeamDocs.length;
        const averageGameElo = (averageBlueTeamElo + averageRedTeamElo) / 2;
        const teamEloDifference = averageBlueTeamElo - averageRedTeamElo;
        const blueTeamWin = winner === 'blue';

        for (const player of blueTeamDocs) {
            const eloChange = calculateEloChange(
                player.elo,
                averageRedTeamElo,
                blueTeamWin ? 1 : 0,
                24,
                1,
                player.winStreak,
                blueTeamWin
            );
            player.elo += applyNormalDistribution(eloChange, teamEloDifference, player.elo - averageGameElo);
            if (blueTeamWin) {
                player.wins += 1;
                player.winStreak += 1;
            } else {
                player.losses += 1;
                player.winStreak = 0;
            }
            console.log(`Blue Team Player: ${player.name}, New Elo: ${player.elo}`);
            await player.save();
        }

        for (const player of redTeamDocs) {
            const eloChange = calculateEloChange(
                player.elo,
                averageBlueTeamElo,
                blueTeamWin ? 0 : 1,
                24,
                1,
                player.winStreak,
                !blueTeamWin
            );
            player.elo += applyNormalDistribution(eloChange, teamEloDifference, player.elo - averageGameElo);
            if (!blueTeamWin) {
                player.wins += 1;
                player.winStreak += 1;
            } else {
                player.losses += 1;
                player.winStreak = 0;
            }
            console.log(`Red Team Player: ${player.name}, New Elo: ${player.elo}`);
            await player.save();
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

module.exports = router;

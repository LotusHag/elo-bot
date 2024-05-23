const express = require('express');
const router = express.Router();
const Game = require('../models/game');
const Player = require('../models/player');
const Match = require('../models/match');
const Speedrun = require('../models/speedrun');
const LeaderboardHistory = require('../models/leaderboardHistory');
const { ensureAuthenticated } = require('../config/auth');
const path = require('path');

function loadEloCalculationModule(gameName) {
    const gameNameFormatted = gameName.replace(/ /g, '_');
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
    if (game.category === 'Speedrun') {
        const records = await Speedrun.find().populate('player').sort({ time: 1 }).exec();
        res.render('game-leaderboard-speedrunning', { game, records });
    } else {
        const players = await Player.find({ game: gameId }).sort({ elo: -1 }).exec();
        const previousLeaderboard = await LeaderboardHistory.find({ game: gameId }).sort({ timestamp: -1 }).limit(players.length).exec();
        res.render('game-leaderboard', { game, players, previousLeaderboard });
    }
});

router.get('/:gameId/input', ensureAuthenticated, async (req, res) => {
    const game = await Game.findById(req.params.gameId).exec();
    if (game.category === 'Speedrun') {
        res.render('game-input-speedrun', { game });
    } else if (game.name === 'Smash') {
        res.render('game-input-1v1', { game });
    } else if (game.name === 'Rocket League') {
        res.render('game-input-3v3', { game });
    } else if (game.name === 'League of Legends') {
        res.render('game-input-lol', { game });
    } else if (game.name === 'Valorant') {
        res.render('game-input-valorant', { game });
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
    const { updatePlayerStats } = eloCalcModule;

    if (game.category === 'Speedrun') {
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

        await updatePlayerStats(player1Doc, winner === 'player1', player2Doc.elo, (player1Doc.elo + player2Doc.elo) / 2, 0, player1Doc.winStreak, 1);
        await updatePlayerStats(player2Doc, winner === 'player2', player1Doc.elo, (player1Doc.elo + player2Doc.elo) / 2, 0, player2Doc.winStreak, 1);

        console.log(`Player 1 Elo: ${player1Doc.elo}`);
        console.log(`Player 2 Elo: ${player2Doc.elo}`);
    } else {
        const { blueTeam, redTeam, winner, matchID } = req.body;
        const blueTeamNames = blueTeam.map(name => name.trim());
        const redTeamNames = redTeam.map(name => name.trim());

        let blueTeamDocs = await Player.find({ name: { $in: blueTeamNames }, game: gameId }).exec();
        let redTeamDocs = await Player.find({ name: { $in: redTeamNames }, game: gameId }).exec();

        for (let playerName of blueTeamNames) {
            let playerDoc = blueTeamDocs.find(p => p.name === playerName);
            if (!playerDoc) {
                try {
                    playerDoc = new Player({ name: playerName, game: gameId });
                    await playerDoc.save();
                    blueTeamDocs.push(playerDoc);
                } catch (error) {
                    console.error(`Error saving player ${playerName}:`, error);
                }
            }
        }

        for (let playerName of redTeamNames) {
            let playerDoc = redTeamDocs.find(p => p.name === playerName);
            if (!playerDoc) {
                try {
                    playerDoc = new Player({ name: playerName, game: gameId });
                    await playerDoc.save();
                    redTeamDocs.push(playerDoc);
                } catch (error) {
                    console.error(`Error saving player ${playerName}:`, error);
                }
            }
        }

        const averageBlueTeamElo = blueTeamDocs.reduce((sum, player) => sum + player.elo, 0) / blueTeamDocs.length;
        const averageRedTeamElo = redTeamDocs.reduce((sum, player) => sum + player.elo, 0) / redTeamDocs.length;
        const averageGameElo = (averageBlueTeamElo + averageRedTeamElo) / 2;
        const teamEloDifference = averageBlueTeamElo - averageRedTeamElo;
        const blueTeamWin = winner === 'Blue Team';

        await saveCurrentLeaderboardState(gameId); // Save the current leaderboard state before updating

        console.log(`Average Blue Team Elo: ${averageBlueTeamElo}`);
        console.log(`Average Red Team Elo: ${averageRedTeamElo}`);
        console.log(`Average Game Elo: ${averageGameElo}`);
        console.log(`Team Elo Difference: ${teamEloDifference}`);

        if (blueTeamWin) {
            for (const player of blueTeamDocs) {
                await updatePlayerStats(player, true, averageRedTeamElo, averageGameElo, -teamEloDifference, player.winStreak, 1); // Fix teamEloDifference sign
                console.log(`Blue Team Player: ${player.name}, New Elo: ${player.elo}`);
            }
            for (const player of redTeamDocs) {
                await updatePlayerStats(player, false, averageBlueTeamElo, averageGameElo, teamEloDifference, player.winStreak, 1);
                console.log(`Red Team Player: ${player.name}, New Elo: ${player.elo}`);
            }
        } else {
            for (const player of redTeamDocs) {
                await updatePlayerStats(player, true, averageBlueTeamElo, averageGameElo, -teamEloDifference, player.winStreak, 1); // Fix teamEloDifference sign
                console.log(`Red Team Player: ${player.name}, New Elo: ${player.elo}`);
            }
            for (const player of blueTeamDocs) {
                await updatePlayerStats(player, false, averageRedTeamElo, averageGameElo, teamEloDifference, player.winStreak, 1);
                console.log(`Blue Team Player: ${player.name}, New Elo: ${player.elo}`);
            }
        }

        const match = new Match({
            blueTeam: blueTeamDocs.map(player => player._id),
            redTeam: redTeamDocs.map(player => player._id),
            winner,
            matchID,
            type: game.name === 'Rocket League' ? '3v3' : '5v5'
        });
        await match.save();
    }

    res.redirect(`/games/${gameId}`);
});

async function saveCurrentLeaderboardState(gameId) {
    const players = await Player.find({ game: gameId }).sort({ elo: -1 }).exec();
    const timestamp = new Date();

    const leaderboardEntries = players.map((player, index) => ({
        playerId: player._id,
        game: gameId,
        elo: player.elo,
        rank: index + 1,
        wins: player.wins,
        losses: player.losses,
        winStreak: player.winStreak,
        timestamp
    }));

    await LeaderboardHistory.insertMany(leaderboardEntries);
}

module.exports = router;

const express = require('express');
const router = express.Router();
const Game = require('../models/game');
const PlayerLOL = require('../models/playerLOL');
const PlayerValo = require('../models/playerValo');
const PlayerRL = require('../models/playerRL');
const PlayerTrackmania = require('../models/playerTrackmania');
const Speedrun = require('../models/speedrun');
const LeaderboardHistory = require('../models/leaderboardHistory');
const Match = require('../models/match');  // Import the Match model
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
        let players;
        switch (game.name) {
            case 'League of Legends':
                players = await PlayerLOL.find({ game: gameId }).sort({ elo: -1 }).exec();
                break;
            case 'Rocket League':
                players = await PlayerRL.find({ game: gameId }).sort({ elo: -1 }).exec();
                break;
            case 'Valorant':
                players = await PlayerValo.find({ game: gameId }).sort({ elo: -1 }).exec();
                break;
            case 'Trackmania':
                players = await PlayerTrackmania.find({ game: gameId }).sort({ elo: -1 }).exec();
                break;
            default:
                return res.status(500).send('Unknown game');
        }
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
        res.render('game-input-rocketleague', { game });
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
        case 'Trackmania':
            PlayerModel = PlayerTrackmania;
            break;
        default:
            return res.status(500).send('Unknown game');
    }

    if (game.category === 'Speedrun') {
        const { player, gameCategory, map, time } = req.body;
        let playerDoc = await PlayerModel.findOne({ name: player, game: gameId }).exec();
        if (!playerDoc) {
            playerDoc = new PlayerModel({ name: player, game: gameId });
            await playerDoc.save();
        }
        const record = new Speedrun({ player: playerDoc._id, gameCategory, map, time });
        await record.save();
    } else if (game.name === 'Smash') {
        const { player1, player2, winner } = req.body;
        let player1Doc = await PlayerModel.findOne({ name: player1, game: gameId }).exec();
        let player2Doc = await PlayerModel.findOne({ name: player2, game: gameId }).exec();

        if (!player1Doc) player1Doc = new PlayerModel({ name: player1, game: gameId });
        if (!player2Doc) player2Doc = new PlayerModel({ name: player2, game: gameId });

        await updatePlayerStats(player1Doc, winner === 'player1', player2Doc.elo, (player1Doc.elo + player2Doc.elo) / 2, 0, player1Doc.winStreak, 1);
        await updatePlayerStats(player2Doc, winner === 'player2', player1Doc.elo, (player1Doc.elo + player2Doc.elo) / 2, 0, player2Doc.winStreak, 1);

        console.log(`Player 1 Elo: ${player1Doc.elo}`);
        console.log(`Player 2 Elo: ${player2Doc.elo}`);
    } else {
        const { blueTeam, redTeam, winner } = req.body;
        const blueTeamNames = blueTeam.map(name => name.trim());
        const redTeamNames = redTeam.map(name => name.trim());

        let blueTeamDocs = await PlayerModel.find({ name: { $in: blueTeamNames }, game: gameId }).exec();
        let redTeamDocs = await PlayerModel.find({ name: { $in: redTeamNames }, game: gameId }).exec();

        const blueTeamSet = new Set(blueTeamNames);
        blueTeamDocs = blueTeamDocs.filter(player => blueTeamSet.has(player.name));

        const redTeamSet = new Set(redTeamNames);
        redTeamDocs = redTeamDocs.filter(player => redTeamSet.has(player.name));

        for (let playerName of blueTeamNames) {
            let playerDoc = blueTeamDocs.find(p => p.name === playerName);
            if (!playerDoc) {
                try {
                    playerDoc = new PlayerModel({ name: playerName, game: gameId });
                    await playerDoc.save();
                    blueTeamDocs.push(playerDoc);
                } catch (err) {
                    if (err.code === 11000) {
                        playerDoc = await PlayerModel.findOne({ name: playerName, game: gameId }).exec();
                        blueTeamDocs.push(playerDoc);
                    } else {
                        console.error('Error creating player:', err);
                        return res.status(500).send('Error creating player');
                    }
                }
            }
        }

        for (let playerName of redTeamNames) {
            let playerDoc = redTeamDocs.find(p => p.name === playerName);
            if (!playerDoc) {
                try {
                    playerDoc = new PlayerModel({ name: playerName, game: gameId });
                    await playerDoc.save();
                    redTeamDocs.push(playerDoc);
                } catch (err) {
                    if (err.code === 11000) {
                        playerDoc = await PlayerModel.findOne({ name: playerName, game: gameId }).exec();
                        redTeamDocs.push(playerDoc);
                    } else {
                        console.error('Error creating player:', err);
                        return res.status(500).send('Error creating player');
                    }
                }
            }
        }

        const averageBlueTeamElo = blueTeamDocs.length > 0 ? blueTeamDocs.reduce((sum, player) => sum + player.elo, 0) / blueTeamDocs.length : NaN;
        const averageRedTeamElo = redTeamDocs.length > 0 ? redTeamDocs.reduce((sum, player) => sum + player.elo, 0) / redTeamDocs.length : NaN;
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
            type: game.name === 'Rocket League' ? '3v3' : '5v5'
        });
        await match.save();
    }

    res.redirect(`/games/${gameId}`);
});

async function saveCurrentLeaderboardState(gameId) {
    const game = await Game.findById(gameId).exec();
    let players;
    switch (game.name) {
        case 'League of Legends':
            players = await PlayerLOL.find({ game: gameId }).sort({ elo: -1 }).exec();
            break;
        case 'Rocket League':
            players = await PlayerRL.find({ game: gameId }).sort({ elo: -1 }).exec();
            break;
        case 'Valorant':
            players = await PlayerValo.find({ game: gameId }).sort({ elo: -1 }).exec();
            break;
        case 'Trackmania':
            players = await PlayerTrackmania.find({ game: gameId }).sort({ elo: -1 }).exec();
            break;
        default:
            return;
    }

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

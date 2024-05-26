const express = require('express');
const router = express.Router();
const Game = require('../models/game');
const PlayerLOL = require('../models/playerLOL');
const PlayerValo = require('../models/playerValo');
const PlayerRL = require('../models/playerRL');
const LeaderboardHistory = require('../models/leaderboardHistory');
const Match = require('../models/match');
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
        default:
            return res.status(500).send('Unknown game');
    }
    const previousLeaderboard = await LeaderboardHistory.find({ game: gameId }).sort({ timestamp: -1 }).limit(players.length).exec();
    res.render('game-leaderboard', { game, players, previousLeaderboard });
});

router.get('/:gameId/input', ensureAuthenticated, async (req, res) => {
    const game = await Game.findById(req.params.gameId).exec();
    if (game.name === 'Smash') {
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
        default:
            return res.status(500).send('Unknown game');
    }

    if (game.name === 'Smash') {
        const { player1, player2, winner } = req.body;
        let player1Doc = await PlayerModel.findOne({ name: player1.toLowerCase(), game: gameId }).exec();
        let player2Doc = await PlayerModel.findOne({ name: player2.toLowerCase(), game: gameId }).exec();

        if (!player1Doc) player1Doc = new PlayerModel({ name: player1.toLowerCase(), game: gameId });
        if (!player2Doc) player2Doc = new PlayerModel({ name: player2.toLowerCase(), game: gameId });

        await updatePlayerStats(player1Doc, winner === 'player1', player2Doc.elo, (player1Doc.elo + player2Doc.elo) / 2, 0, player1Doc.winStreak, 1);
        await updatePlayerStats(player2Doc, winner === 'player2', player1Doc.elo, (player1Doc.elo + player2Doc.elo) / 2, 0, player2Doc.winStreak, 1);

        console.log(`Player 1 Elo: ${player1Doc.elo}`);
        console.log(`Player 2 Elo: ${player2Doc.elo}`);
    } else {
        const { blueTeam, redTeam, winner } = req.body;
        const blueTeamNames = blueTeam.map(name => name.trim().toLowerCase());
        const redTeamNames = redTeam.map(name => name.trim().toLowerCase());

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
                await updatePlayerStats(player, true, averageRedTeamElo, averageGameElo, -teamEloDifference, player.winStreak, 1);
                console.log(`Blue Team Player: ${player.name}, New Elo: ${player.elo}`);
            }
            for (const player of redTeamDocs) {
                await updatePlayerStats(player, false, averageBlueTeamElo, averageGameElo, teamEloDifference, player.winStreak, 1);
                console.log(`Red Team Player: ${player.name}, New Elo: ${player.elo}`);
            }
        } else {
            for (const player of redTeamDocs) {
                await updatePlayerStats(player, true, averageBlueTeamElo, averageGameElo, -teamEloDifference, player.winStreak, 1);
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

// Custom game creation pages and handlers
router.get('/:gameId/custom-game', ensureAuthenticated, async (req, res) => {
    const game = await Game.findById(req.params.gameId).exec();
    res.render('game-custom-create', { game });
});

router.post('/:gameId/custom-game', ensureAuthenticated, async (req, res) => {
    const gameId = req.params.gameId;
    const game = await Game.findById(gameId).exec();
    const { players, roles, winner } = req.body;

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

    // Convert player names to lowercase immediately
    const lowercasedPlayers = players.map(player => player.toLowerCase());

    let playerDocs = await PlayerModel.find({ name: { $in: lowercasedPlayers }, game: gameId }).exec();
    const existingPlayers = new Set(playerDocs.map(player => player.name));
    for (let playerName of lowercasedPlayers) {
        if (!existingPlayers.has(playerName)) {
            const newPlayer = new PlayerModel({ name: playerName, game: gameId });
            await newPlayer.save();
            playerDocs.push(newPlayer);
        }
    }

    if (game.name === 'League of Legends') {
        // Assign roles for League of Legends
        playerDocs.forEach(player => {
            const role = roles[players.indexOf(player.name)];
            player.role = role;
        });
    }

    // Enhanced Simulated Annealing function for team balancing
    const simulatedAnnealing = (players, initialTemp, coolingRate) => {
        let currentSolution = players.slice();
        let bestSolution = players.slice();
        let currentTemp = initialTemp;

        const calculateEloDifference = (team1, team2) => {
            const avgElo1 = team1.reduce((sum, p) => sum + p.elo, 0) / team1.length;
            const avgElo2 = team2.reduce((sum, p) => sum + p.elo, 0) / team2.length;
            return Math.abs(avgElo1 - avgElo2);
        };

        const assignRoles = (players) => {
            const roles = ['Top', 'Jungle', 'Mid', 'Bot', 'Support'];
            const roleCounts = {
                'Top': 0,
                'Jungle': 0,
                'Mid': 0,
                'Bot': 0,
                'Support': 0
            };

            players.forEach(player => {
                if (roles.includes(player.role) && roleCounts[player.role] < 1) {
                    roleCounts[player.role]++;
                } else {
                    player.role = 'Autofill';
                }
            });
        };

        const generateNeighbor = (solution) => {
            const newSolution = solution.slice();
            const idx1 = Math.floor(Math.random() * newSolution.length);
            let idx2 = Math.floor(Math.random() * newSolution.length);
            while (idx1 === idx2) {
                idx2 = Math.floor(Math.random() * newSolution.length);
            }
            [newSolution[idx1], newSolution[idx2]] = [newSolution[idx2], newSolution[idx1]];
            if (game.name === 'League of Legends') {
                assignRoles(newSolution.slice(0, 5));
                assignRoles(newSolution.slice(5));
            }
            return newSolution;
        };

        const acceptanceProbability = (currentEloDiff, newEloDiff, temp) => {
            if (newEloDiff < currentEloDiff) {
                return 1.0;
            }
            return Math.exp((currentEloDiff - newEloDiff) / temp);
        };

        while (currentTemp > 1) {
            const newSolution = generateNeighbor(currentSolution);
            const team1 = game.name === 'Rocket League' ? newSolution.slice(0, 3) : newSolution.slice(0, 5);
            const team2 = game.name === 'Rocket League' ? newSolution.slice(3, 6) : newSolution.slice(5);
            const currentEloDiff = calculateEloDifference(currentSolution.slice(0, team1.length), currentSolution.slice(team1.length));
            const newEloDiff = calculateEloDifference(team1, team2);

            if (acceptanceProbability(currentEloDiff, newEloDiff, currentTemp) > Math.random()) {
                currentSolution = newSolution.slice();
            }

            if (newEloDiff < calculateEloDifference(bestSolution.slice(0, team1.length), bestSolution.slice(team1.length))) {
                bestSolution = newSolution.slice();
            }

            currentTemp *= coolingRate;
        }

        return bestSolution;
    };

    // Apply Simulated Annealing to optimize team balance
    const optimizedPlayers = simulatedAnnealing(playerDocs, 1000, 0.995);
    const blueTeam = game.name === 'Rocket League' ? optimizedPlayers.slice(0, 3) : optimizedPlayers.slice(0, 5);
    const redTeam = game.name === 'Rocket League' ? optimizedPlayers.slice(3, 6) : optimizedPlayers.slice(5);

    if (game.name === 'League of Legends') {
        // Ensure full teams with all roles
        const ensureFullTeams = (team) => {
            const requiredRoles = ['Top', 'Jungle', 'Mid', 'Bot', 'Support'];
            const assignedRoles = team.map(player => player.role);

            requiredRoles.forEach(role => {
                if (!assignedRoles.includes(role)) {
                    const fillPlayerIndex = team.findIndex(p => p.role === 'Fill' || p.role === 'Autofill');
                    if (fillPlayerIndex >= 0) {
                        team[fillPlayerIndex].role = role;
                        assignedRoles.push(role);
                    }
                }
            });
        };

        ensureFullTeams(blueTeam);
        ensureFullTeams(redTeam);
    }

    const averageEloBlueTeam = blueTeam.reduce((sum, player) => sum + player.elo, 0) / blueTeam.length;
    const averageEloRedTeam = redTeam.reduce((sum, player) => sum + player.elo, 0) / redTeam.length;

    // Render the results
    res.render('game-custom-result', { game, blueTeam, redTeam, averageEloBlueTeam, averageEloRedTeam });
});

module.exports = router;

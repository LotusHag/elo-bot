const express = require('express');
const router = express.Router();
const Player = require('../models/player');
const Match = require('../models/match');
const LeaderboardHistory = require('../models/leaderboardHistory');

// Helper function to calculate Elo change
const calculateEloChange = (playerElo, averageEnemyElo, actualScore, kFactor, matchImportance, winStreak, isWinner) => {
    const expectedScore = 1 / (1 + Math.pow(10, (averageEnemyElo - playerElo) / 400));
    const modifiedActualScore = actualScore === 1 ? actualScore + 0.05 : actualScore - 0.05;
    const winStreakMultiplier = winStreak > 2 ? 1 + (Math.min(winStreak - 2, 3) * 0.035) : 1; // 3.5% per win streak above 2, capped at 5 games
    let eloChange = matchImportance * kFactor * winStreakMultiplier * (modifiedActualScore - expectedScore);

    // Apply the win/loss multiplier
    if (isWinner) {
        eloChange *= 1.25;
    } else {
        eloChange *= 0.9;
    }

    return eloChange;
};

// Helper function to update player stats
const updatePlayerStats = async (playerName, isWinner, averageEnemyElo, averageGameElo, teamEloDifference, winStreak, matchImportance) => {
    let player = await Player.findOne({ name: new RegExp('^' + playerName + '$', 'i') });
    if (!player) {
        player = new Player({ name: playerName });
    }

    const actualScore = isWinner ? 1 : 0;

    // Determine K-factor based on number of games played
    const totalGames = player.wins + player.losses;
    const baseKFactor = 24 * 1.33; // Adjusted to have a baseline around 24 Elo change in the first game
    const initialGameMultiplier = totalGames < 10 ? 1.5 : 1;
    const adjustedKFactor = baseKFactor * initialGameMultiplier;

    // Calculate Elo change
    let eloChange = calculateEloChange(player.elo, averageEnemyElo, actualScore, adjustedKFactor, matchImportance, winStreak, isWinner);

    // Adjust Elo change based on player's relative position in the game and team difference
    if (player.elo > averageGameElo) {
        eloChange *= 0.9; // Player is above average in the game
    } else if (player.elo < averageGameElo) {
        eloChange *= 1.1; // Player is below average in the game
    }

    if (teamEloDifference > 0) {
        eloChange *= 0.9; // Player's team is stronger
    } else if (teamEloDifference < 0) {
        eloChange *= 1.1; // Player's team is weaker
    }

    // Update player stats
    if (isWinner) {
        player.wins += 1;
        player.elo += eloChange;
        player.winStreak += 1;
    } else {
        player.losses += 1;
        player.elo += eloChange; // Note: eloChange is negative if the player loses
        player.winStreak = 0;
    }

    await player.save();
};

// Function to save the current leaderboard state
const saveCurrentLeaderboardState = async () => {
    const players = await Player.find().sort({ elo: -1 }).exec();
    const timestamp = new Date();

    const leaderboardEntries = players.map((player, index) => ({
        playerId: player._id,
        elo: player.elo,
        rank: index + 1,
        wins: player.wins,
        losses: player.losses,
        winStreak: player.winStreak,
        timestamp
    }));

    await LeaderboardHistory.insertMany(leaderboardEntries);
};

// Route to display player input form
router.get('/input', (req, res) => {
    res.render('player-input');
});

// Route to submit player results
router.post('/input', async (req, res) => {
    const { blueTeam, redTeam, winner, matchID } = req.body;
    const blueTeamNames = blueTeam.map(name => name.trim().toLowerCase());
    const redTeamNames = redTeam.map(name => name.trim().toLowerCase());

    console.log('Blue Team Names:', blueTeamNames);
    console.log('Red Team Names:', redTeamNames);

    for (const playerName of [...blueTeamNames, ...redTeamNames]) {
        let player = await Player.findOne({ name: new RegExp('^' + playerName + '$', 'i') });
        if (!player) {
            player = new Player({ name: playerName });
            await player.save();
        }
    }

    const allPlayers = [...blueTeamNames, ...redTeamNames];
    const playerDocs = await Player.find({ name: { $in: allPlayers.map(name => new RegExp('^' + name + '$', 'i')) } });

    const blueTeamIds = playerDocs.filter(player => blueTeamNames.includes(player.name.toLowerCase())).map(player => player._id);
    const redTeamIds = playerDocs.filter(player => redTeamNames.includes(player.name.toLowerCase())).map(player => player._id);

    console.log('Blue Team Docs:', playerDocs.filter(player => blueTeamNames.includes(player.name.toLowerCase())));
    console.log('Red Team Docs:', playerDocs.filter(player => redTeamNames.includes(player.name.toLowerCase())));
    console.log('Blue Team IDs:', blueTeamIds);
    console.log('Red Team IDs:', redTeamIds);

    const averageBlueTeamElo = blueTeamIds.length > 0 ? blueTeamIds.reduce((sum, id) => sum + playerDocs.find(player => player._id.equals(id)).elo, 0) / blueTeamIds.length : NaN;
    const averageRedTeamElo = redTeamIds.length > 0 ? redTeamIds.reduce((sum, id) => sum + playerDocs.find(player => player._id.equals(id)).elo, 0) / redTeamIds.length : NaN;

    console.log('Average Blue Team Elo:', averageBlueTeamElo);
    console.log('Average Red Team Elo:', averageRedTeamElo);

    if (isNaN(averageBlueTeamElo) || isNaN(averageRedTeamElo) || averageBlueTeamElo === 0 || averageRedTeamElo === 0) {
        console.error('Invalid team Elo calculation. Blue Team Elo:', averageBlueTeamElo, 'Red Team Elo:', averageRedTeamElo);
        throw new Error('Invalid team Elo calculation');
    }

    const averageGameElo = (averageBlueTeamElo + averageRedTeamElo) / 2;
    const teamEloDifference = averageBlueTeamElo - averageRedTeamElo;
    const blueTeamWin = winner === 'Blue Team';
    const matchImportance = 1; // You can adjust this value or make it dynamic based on the match's importance

    await saveCurrentLeaderboardState(); // Save the current leaderboard state before updating

    for (const playerName of blueTeamNames) {
        const player = playerDocs.find(player => player.name.toLowerCase() === playerName.toLowerCase());
        const winStreak = player.winStreak || 0;
        await updatePlayerStats(playerName, blueTeamWin, averageRedTeamElo, averageGameElo, teamEloDifference, winStreak, matchImportance);
    }

    for (const playerName of redTeamNames) {
        const player = playerDocs.find(player => player.name.toLowerCase() === playerName.toLowerCase());
        const winStreak = player.winStreak || 0;
        await updatePlayerStats(playerName, !blueTeamWin, averageBlueTeamElo, averageGameElo, -teamEloDifference, winStreak, matchImportance);
    }

    const match = new Match({
        blueTeam: blueTeamIds,
        redTeam: redTeamIds,
        winner,
        matchID,
        type: 'team'
    });

    await match.save();

    res.redirect('/players/leaderboard');
});

// Route to display player leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const players = await Player.find().sort({ elo: -1 }).exec();
        const previousLeaderboard = await LeaderboardHistory.find().sort({ timestamp: -1 }).limit(players.length).exec();
        res.render('player-leaderboard', { players, previousLeaderboard });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;

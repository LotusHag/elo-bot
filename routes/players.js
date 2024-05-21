const express = require('express');
const router = express.Router();
const Player = require('../models/player');
const Match = require('../models/match');

// Helper function to calculate Elo change
const calculateEloChange = (playerElo, averageEnemyElo, actualScore, kFactor) => {
    const expectedScore = 1 / (1 + Math.pow(10, (averageEnemyElo - playerElo) / 400));
    return kFactor * (actualScore - expectedScore);
};

// Helper function to update player stats
const updatePlayerStats = async (playerName, isWinner, averageEnemyElo, averageGameElo, teamEloDifference, winStreak) => {
    let player = await Player.findOne({ name: new RegExp('^' + playerName + '$', 'i') });
    if (!player) {
        player = new Player({ name: playerName });
    }

    const actualScore = isWinner ? 1 : 0;

    // Determine K-factor based on win streak
    const kFactorBase = player.wins + player.losses < 10 ? 24 : 16;
    const kFactor = kFactorBase + Math.min(winStreak * 2, 10); // Cap the increase from win streak

    // Calculate Elo change
    let eloChange = calculateEloChange(player.elo, averageEnemyElo, actualScore, kFactor);

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

// Route to display player input form
router.get('/input', (req, res) => {
    res.render('player-input');
});

// Route to submit player results
router.post('/input', async (req, res) => {
    const { blueTeam, redTeam, winner, matchID } = req.body;
    const blueTeamNames = blueTeam;
    const redTeamNames = redTeam;

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

    const averageBlueTeamElo = blueTeamIds.reduce((sum, id) => sum + playerDocs.find(player => player._id.equals(id)).elo, 0) / blueTeamIds.length;
    const averageRedTeamElo = redTeamIds.reduce((sum, id) => sum + playerDocs.find(player => player._id.equals(id)).elo, 0) / redTeamIds.length;

    if (isNaN(averageBlueTeamElo) || isNaN(averageRedTeamElo) || averageBlueTeamElo === 0 || averageRedTeamElo === 0) {
        throw new Error('Invalid team Elo calculation');
    }

    const averageGameElo = (averageBlueTeamElo + averageRedTeamElo) / 2;
    const teamEloDifference = averageBlueTeamElo - averageRedTeamElo;
    const blueTeamWin = winner === 'Blue Team';

    for (const playerName of blueTeamNames) {
        const player = playerDocs.find(player => player.name.toLowerCase() === playerName.toLowerCase());
        const winStreak = player.winStreak || 0;
        await updatePlayerStats(playerName, blueTeamWin, averageRedTeamElo, averageGameElo, teamEloDifference, winStreak);
    }

    for (const playerName of redTeamNames) {
        const player = playerDocs.find(player => player.name.toLowerCase() === playerName.toLowerCase());
        const winStreak = player.winStreak || 0;
        await updatePlayerStats(playerName, !blueTeamWin, averageBlueTeamElo, averageGameElo, -teamEloDifference, winStreak);
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
        res.render('player-leaderboard', { players });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Player = require('../models/player');
const Match = require('../models/match');

// Helper function to update player stats
const updatePlayerStats = async (playerName, isWinner, averageEnemyElo, averageTeamElo, averageGameElo) => {
    const player = await Player.findOne({ name: new RegExp('^' + playerName + '$', 'i') });
    if (!player) {
        throw new Error(`Player ${playerName} not found`);
    }

    const kFactor = player.wins + player.losses < 10 ? 24 : 16; // Higher K-factor for new players
    const eloChange = kFactor * (isWinner ? 1 : -1) * (1 - (player.elo / averageEnemyElo));

    if (isWinner) {
        player.wins += 1;
        player.elo += eloChange;
        player.winStreak += 1; // Increment win streak
    } else {
        player.losses += 1;
        player.elo -= eloChange;
        player.winStreak = 0; // Reset win streak
    }

    await player.save();
};

// Route to submit player results
router.post('/input', async (req, res) => {
    const { blueTeam, redTeam, winner, matchID } = req.body;
    const blueTeamNames = [blueTeam.player1, blueTeam.player2, blueTeam.player3, blueTeam.player4, blueTeam.player5];
    const redTeamNames = [redTeam.player1, redTeam.player2, redTeam.player3, redTeam.player4, redTeam.player5];

    const allPlayers = [...blueTeamNames, ...redTeamNames];
    const playerDocs = await Player.find({ name: { $in: allPlayers.map(name => new RegExp('^' + name + '$', 'i')) } });
    
    const averageBlueTeamElo = playerDocs.filter(player => blueTeamNames.includes(player.name.toLowerCase())).reduce((sum, player) => sum + player.elo, 0) / 5;
    const averageRedTeamElo = playerDocs.filter(player => redTeamNames.includes(player.name.toLowerCase())).reduce((sum, player) => sum + player.elo, 0) / 5;
    const averageGameElo = (averageBlueTeamElo + averageRedTeamElo) / 2;

    const blueTeamWin = winner === 'Blue Team';

    for (const playerName of blueTeamNames) {
        await updatePlayerStats(playerName, blueTeamWin, averageRedTeamElo, averageBlueTeamElo, averageGameElo);
    }

    for (const playerName of redTeamNames) {
        await updatePlayerStats(playerName, !blueTeamWin, averageBlueTeamElo, averageRedTeamElo, averageGameElo);
    }

    const match = new Match({
        blueTeam: blueTeamNames.map(name => playerDocs.find(player => player.name.toLowerCase() === name.toLowerCase())._id),
        redTeam: redTeamNames.map(name => playerDocs.find(player => player.name.toLowerCase() === name.toLowerCase())._id),
        winner,
        matchID,
        type: 'team'
    });

    await match.save();

    res.redirect('/players/leaderboard');
});

module.exports = router;

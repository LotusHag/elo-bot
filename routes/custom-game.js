const express = require('express');
const router = express.Router();
const Player = require('../models/player');

// Route to display custom game setup form
router.get('/setup', async (req, res) => {
    const players = await Player.find().sort({ elo: -1 }).exec();
    res.render('custom-game-setup', { players });
});

// Route to handle custom game setup submission
router.post('/setup', async (req, res) => {
    const { players } = req.body;

    // Default Elo for new players
    const defaultElo = 2000;

    // Process players, create new ones if necessary, and assign roles
    const roles = ['Top', 'Jungle', 'Mid', 'Bot', 'Support'];
    let allPlayers = [];

    // Fetch players from database or create new ones with default Elo
    for (const playerData of players) {
        let player = await Player.findOne({ name: new RegExp('^' + playerData.name + '$', 'i') });
        if (!player) {
            player = new Player({ name: playerData.name, elo: defaultElo });
            await player.save();
        }
        player.role = playerData.role;
        allPlayers.push(player);
    }

    // Sort players by Elo (ascending)
    allPlayers.sort((a, b) => a.elo - b.elo);

    // Randomly assign players to teams
    let team1 = [];
    let team2 = [];
    let team1Elo = 0;
    let team2Elo = 0;

    // Assign players to teams while balancing Elo
    for (let i = 0; i < allPlayers.length; i++) {
        if (team1.length < 5 && team2.length < 5) {
            // Assign based on current total Elo to balance teams
            if (team1Elo <= team2Elo) {
                team1.push(allPlayers[i]);
                team1Elo += allPlayers[i].elo;
            } else {
                team2.push(allPlayers[i]);
                team2Elo += allPlayers[i].elo;
            }
        } else if (team1.length < 5) {
            team1.push(allPlayers[i]);
            team1Elo += allPlayers[i].elo;
        } else {
            team2.push(allPlayers[i]);
            team2Elo += allPlayers[i].elo;
        }
    }

    // Assign roles prioritizing lower Elo players
    function assignRoles(team) {
        const roleMap = {
            Top: null,
            Jungle: null,
            Mid: null,
            Bot: null,
            Support: null,
        };
        const fillPlayers = [];

        // Try to assign preferred roles
        for (const player of team) {
            if (roleMap[player.role] === null) {
                roleMap[player.role] = player;
            } else {
                fillPlayers.push(player);
            }
        }

        // Fill remaining roles with fill players
        for (const role in roleMap) {
            if (roleMap[role] === null && fillPlayers.length > 0) {
                roleMap[role] = fillPlayers.shift();
                roleMap[role].role = role;  // Update role to the assigned role
            }
        }

        // Ensure all roles are filled
        return Object.values(roleMap);
    }

    team1 = assignRoles(team1);
    team2 = assignRoles(team2);

    // Logging to debug
    console.log('Team 1:', team1);
    console.log('Team 2:', team2);

    res.render('custom-game-teams', { team1, team2 });
});

module.exports = router;

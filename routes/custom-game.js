const express = require('express');
const router = express.Router();
const Player = require('../models/player');

// Simulated Annealing function for team balancing
const simulatedAnnealing = (players, initialTemp, coolingRate) => {
    let currentSolution = players.slice();
    let bestSolution = players.slice();
    let currentTemp = initialTemp;

    const calculateEloDifference = (team1, team2) => {
        const avgElo1 = team1.reduce((sum, p) => sum + p.elo, 0) / team1.length;
        const avgElo2 = team2.reduce((sum, p) => sum + p.elo, 0) / team2.length;
        return Math.abs(avgElo1 - avgElo2);
    };

    const generateNeighbor = (solution) => {
        const newSolution = solution.slice();
        const idx1 = Math.floor(Math.random() * newSolution.length);
        let idx2 = Math.floor(Math.random() * newSolution.length);
        while (idx1 === idx2) {
            idx2 = Math.floor(Math.random() * newSolution.length);
        }
        [newSolution[idx1], newSolution[idx2]] = [newSolution[idx2], newSolution[idx1]];
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
        const team1 = newSolution.slice(0, 5);
        const team2 = newSolution.slice(5);
        const currentEloDiff = calculateEloDifference(currentSolution.slice(0, 5), currentSolution.slice(5));
        const newEloDiff = calculateEloDifference(team1, team2);

        if (acceptanceProbability(currentEloDiff, newEloDiff, currentTemp) > Math.random()) {
            currentSolution = newSolution.slice();
        }

        if (newEloDiff < calculateEloDifference(bestSolution.slice(0, 5), bestSolution.slice(5))) {
            bestSolution = newSolution.slice();
        }

        currentTemp *= coolingRate;
    }

    return bestSolution;
};

router.post('/create-teams', async (req, res) => {
    const { players } = req.body;

    // Fetch player data from the database
    let playerDocs = await Player.find({ name: { $in: players.map(p => p.name) } });

    // Create any missing players
    for (let player of players) {
        let playerDoc = playerDocs.find(p => p.name === player.name);
        if (!playerDoc) {
            playerDoc = new Player({ name: player.name, role: player.role, elo: 2000 });
            await playerDoc.save();
            playerDocs.push(playerDoc);
        } else {
            playerDoc.role = player.role; // Update role
        }
    }

    // Assign roles to players
    playerDocs.forEach(playerDoc => {
        const player = players.find(p => p.name === playerDoc.name);
        playerDoc.role = player.role;
    });

    // Apply Simulated Annealing to optimize team balance
    const optimizedPlayers = simulatedAnnealing(playerDocs, 1000, 0.995);
    const team1 = optimizedPlayers.slice(0, 5);
    const team2 = optimizedPlayers.slice(5);

    // Ensure full teams with all roles
    const ensureFullTeams = (team) => {
        const requiredRoles = ['Top', 'Jungle', 'Mid', 'Bot', 'Support'];
        const assignedRoles = team.map(player => player.role);

        requiredRoles.forEach(role => {
            if (!assignedRoles.includes(role)) {
                const fillPlayerIndex = team.findIndex(p => p.role === 'Fill');
                if (fillPlayerIndex >= 0) {
                    team[fillPlayerIndex].role = role;
                    assignedRoles.push(role);
                }
            }
        });
    };

    ensureFullTeams(team1);
    ensureFullTeams(team2);

    // Render the results
    res.render('custom-game-teams', { team1, team2 });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Player = require('../models/player');
const Game = require('../models/game');

// Simulated Annealing and other functions

const simulatedAnnealing = (players, initialTemp, coolingRate, roles) => {
    let currentSolution = players.slice();
    let bestSolution = players.slice();
    let currentTemp = initialTemp;

    const calculateEloDifference = (team1, team2) => {
        const avgElo1 = team1.reduce((sum, p) => sum + p.elo, 0) / team1.length;
        const avgElo2 = team2.reduce((sum, p) => sum + p.elo, 0) / team2.length;
        return Math.abs(avgElo1 - avgElo2);
    };

    const calculateWinStreakBoost = (player) => {
        return player.winStreak > 2 ? player.winStreak * 5 : 0;
    };

    const assignRoles = (players, roles) => {
        const roleCounts = {};
        roles.forEach(role => {
            roleCounts[role] = 0;
        });

        players.forEach(player => {
            if (roles.includes(player.role) && roleCounts[player.role] < 1) {
                roleCounts[player.role]++;
            } else {
                player.role = 'Autofill';
            }
        });
    };

    const generateNeighbor = (solution, roles) => {
        const newSolution = solution.slice();
        const idx1 = Math.floor(Math.random() * newSolution.length);
        let idx2 = Math.floor(Math.random() * newSolution.length);
        while (idx1 === idx2) {
            idx2 = Math.floor(Math.random() * newSolution.length);
        }
        [newSolution[idx1], newSolution[idx2]] = [newSolution[idx2], newSolution[idx1]];
        assignRoles(newSolution.slice(0, 5), roles);
        assignRoles(newSolution.slice(5), roles);
        return newSolution;
    };

    const acceptanceProbability = (currentEloDiff, newEloDiff, temp) => {
        if (newEloDiff < currentEloDiff) {
            return 1.0;
        }
        return Math.exp((currentEloDiff - newEloDiff) / temp);
    };

    while (currentTemp > 1) {
        const newSolution = generateNeighbor(currentSolution, roles);
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

// Helper function to calculate potential Elo changes
const calculatePotentialEloChange = (playerElo, averageEnemyElo, actualScore, kFactor, winStreak) => {
    const expectedScore = 1 / (1 + Math.pow(10, (averageEnemyElo - playerElo) / 400));
    const winStreakMultiplier = winStreak > 2 ? 1 + (Math.min(winStreak - 2, 3) * 0.035) : 1; // 3.5% per win streak above 2, capped at 5 games
    let eloChange = kFactor * winStreakMultiplier * (actualScore - expectedScore);

    // Apply the win/loss multiplier
    if (actualScore === 1) {
        eloChange *= 1.25;
    } else {
        eloChange *= 0.9;
    }

    return eloChange;
};

// Route to render the custom game setup page
router.get('/setup', async (req, res) => {
    const game = await Game.findOne({ name: 'League of Legends' }).exec(); // Adjust to get the relevant game
    const roles = game.roles; // Assuming game.roles contains the roles for this game
    res.render('custom-game-setup', { roles });
});

router.post('/create-teams', async (req, res) => {
    const game = await Game.findOne({ name: 'League of Legends' }).exec(); // Adjust to get the relevant game
    const roles = game.roles; // Assuming game.roles contains the roles for this game

    const players = req.body.players.map(p => ({
        name: p.name.toLowerCase().trim(),
        role: p.role
    }));

    // Fetch player data from the database using case-insensitive regex
    let playerDocs = await Player.find({ name: { $in: players.map(p => new RegExp('^' + p.name + '$', 'i')) } });

    // Create any missing players
    for (let player of players) {
        let playerDoc = playerDocs.find(p => p.name.toLowerCase() === player.name.toLowerCase());
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
        const player = players.find(p => p.name.toLowerCase() === playerDoc.name.toLowerCase());
        playerDoc.role = player.role;
    });

    // Apply Simulated Annealing to optimize team balance
    const optimizedPlayers = simulatedAnnealing(playerDocs, 1000, 0.995, roles);
    const team1 = optimizedPlayers.slice(0, 5);
    const team2 = optimizedPlayers.slice(5);

    // Ensure full teams with all roles
    const ensureFullTeams = (team) => {
        const requiredRoles = roles;
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

    ensureFullTeams(team1);
    ensureFullTeams(team2);

    const averageEloTeam1 = team1.reduce((sum, player) => sum + player.elo, 0) / team1.length;
    const averageEloTeam2 = team2.reduce((sum, player) => sum + player.elo, 0) / team2.length;

    team1.forEach(player => {
        player.potentialWinGain = calculatePotentialEloChange(player.elo, averageEloTeam2, 1, 24, player.winStreak);
        player.potentialLoss = calculatePotentialEloChange(player.elo, averageEloTeam2, 0, 24, player.winStreak);
    });

    team2.forEach(player => {
        player.potentialWinGain = calculatePotentialEloChange(player.elo, averageEloTeam1, 1, 24, player.winStreak);
        player.potentialLoss = calculatePotentialEloChange(player.elo, averageEloTeam1, 0, 24, player.winStreak);
    });

    // Render the results
    res.render('custom-game-teams', { team1, team2 });
});

module.exports = router;

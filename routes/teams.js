const express = require('express');
const router = express.Router();
const Team = require('../models/team');
const Match = require('../models/match');

router.get('/input', (req, res) => {
    res.render('team-input');
});

router.post('/input', async (req, res) => {
    try {
        const { blueTeam, redTeam, blueTeamWins, redTeamWins, matchID } = req.body;
        
        if (!blueTeam || !redTeam || !blueTeamWins || !redTeamWins) {
            throw new Error('All fields are required');
        }

        const blueTeamDoc = await Team.findOrCreate(blueTeam);
        const redTeamDoc = await Team.findOrCreate(redTeam);

        let blueTeamScore = parseInt(blueTeamWins, 10);
        let redTeamScore = parseInt(redTeamWins, 10);

        // Check if blue team or red team won
        const winner = blueTeamScore > redTeamScore ? 'blue' : 'red';

        // Create new match
        const match = new Match({
            blueTeam: blueTeamDoc._id,
            redTeam: redTeamDoc._id,
            winner,
            matchID,
            type: 'team',
        });
        await match.save();

        // Update teams' win/loss records
        if (winner === 'blue') {
            blueTeamDoc.wins += 1;
            redTeamDoc.losses += 1;
        } else {
            redTeamDoc.wins += 1;
            blueTeamDoc.losses += 1;
        }

        // Save teams
        await blueTeamDoc.save();
        await redTeamDoc.save();

        res.redirect('/teams/leaderboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/leaderboard', async (req, res) => {
    try {
        const teams = await Team.find().sort({ elo: -1 }).exec();
        res.render('team-leaderboard', { teams });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;

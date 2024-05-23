const mongoose = require('mongoose');
const Game = require('../models/game'); // Correct path to your Game model

// Connect to the MongoDB database
mongoose.connect('mongodb://localhost:27017/eloDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Error connecting to MongoDB', err);
});

const games = [
    {
        name: 'League of Legends',
        category: 'Team'
    },
    {
        name: 'Rocket League',
        category: 'Team'
    },
    {
        name: 'Valorant',
        category: 'Team'
    },
    {
        name: 'Trackmania',
        category: 'Speedrun'
    }
];

// Function to populate the database with initial game data
async function populateGames() {
    try {
        await Game.deleteMany({});
        await Game.insertMany(games);
        console.log('Games populated successfully');
    } catch (error) {
        console.error('Error populating games:', error);
    } finally {
        mongoose.connection.close();
    }
}

populateGames();

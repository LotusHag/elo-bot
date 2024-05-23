const mongoose = require('mongoose');
const Game = require('../models/game');

mongoose.connect('mongodb://localhost/eloDB', {}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

const games = [
    { name: 'Valorant', description: 'A tactical first-person shooter game' },
    { name: 'League of Legends', description: 'A multiplayer online battle arena game' },
    { name: 'Rocket League', description: 'A vehicular soccer video game' },
    { name: 'Smash', description: 'A series of crossover fighting games' },
    { name: 'Trackmania', description: 'A series of racing games' }
];

async function populateGames() {
    await Game.deleteMany({});
    await Game.insertMany(games);
    console.log('Games populated');
    mongoose.connection.close();
}

populateGames();

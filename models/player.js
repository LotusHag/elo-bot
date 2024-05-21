const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    elo: { type: Number, default: 2000 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    winStreak: { type: Number, default: 0 }
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;

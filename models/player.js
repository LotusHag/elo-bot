// models/player.js
const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    game: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: true
    },
    elo: {
        type: Number,
        default: 2000
    },
    wins: {
        type: Number,
        default: 0
    },
    losses: {
        type: Number,
        default: 0
    },
    winStreak: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Player', PlayerSchema);

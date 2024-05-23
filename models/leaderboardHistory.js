// models/leaderboardHistory.js
const mongoose = require('mongoose');

const LeaderboardHistorySchema = new mongoose.Schema({
    playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    game: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: true
    },
    elo: {
        type: Number,
        required: true
    },
    rank: {
        type: Number,
        required: true
    },
    wins: {
        type: Number,
        required: true
    },
    losses: {
        type: Number,
        required: true
    },
    winStreak: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('LeaderboardHistory', LeaderboardHistorySchema);

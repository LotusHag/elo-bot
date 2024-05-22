// models/leaderboardHistory.js
const mongoose = require('mongoose');

const leaderboardHistorySchema = new mongoose.Schema({
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    elo: Number,
    rank: Number,
    wins: Number,
    losses: Number,
    winStreak: Number,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LeaderboardHistory', leaderboardHistorySchema);

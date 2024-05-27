// models/match.js
const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    blueTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
    redTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
    winner: String,
    matchID: String,
    type: String // "individual", "team", "3v3", "Speedrunning"
});

module.exports = mongoose.model('Match', matchSchema);

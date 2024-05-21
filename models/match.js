const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    blueTeam: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    }],
    redTeam: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    }],
    winner: String,
    matchID: String,
    type: String // "individual" or "team"
});

module.exports = mongoose.model('Match', matchSchema);

// models/playerLOL.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlayerLOLSchema = new Schema({
    name: { type: String, required: true },
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    elo: { type: Number, default: 2000 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    winStreak: { type: Number, default: 0 }
});

PlayerLOLSchema.index({ name: 1, game: 1 }, { unique: true });

module.exports = mongoose.model('PlayerLOL', PlayerLOLSchema);

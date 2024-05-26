const mongoose = require('mongoose');

const speedrunSchema = new mongoose.Schema({
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    gameCategory: { type: String, required: true }, // e.g., "Trackmania"
    map: { type: mongoose.Schema.Types.ObjectId, ref: 'TrackmaniaMap', required: true },
    time: { type: Number, required: true }, // Time in milliseconds
    date: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false }
});

const Speedrun = mongoose.model('Speedrun', speedrunSchema);

module.exports = Speedrun;

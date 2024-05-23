const mongoose = require('mongoose');

const speedrunSchema = new mongoose.Schema({
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    gameCategory: { type: String, required: true }, // e.g., "Trackmania"
    map: { type: String, required: true },
    time: { type: Number, required: true }, // Time in seconds
    date: { type: Date, default: Date.now }
});

const Speedrun = mongoose.model('Speedrun', speedrunSchema);

module.exports = Speedrun;

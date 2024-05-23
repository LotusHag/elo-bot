const mongoose = require('mongoose');

const trackmaniaSchema = new mongoose.Schema({
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    map: { type: String, required: true },
    time: { type: Number, required: true }, // Time in seconds
    date: { type: Date, default: Date.now }
});

const Trackmania = mongoose.model('Trackmania', trackmaniaSchema);

module.exports = Trackmania;

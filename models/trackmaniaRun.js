const mongoose = require('mongoose');

const TrackmaniaRunSchema = new mongoose.Schema({
    player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    map: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TrackmaniaMap',
        required: true
    },
    time: {
        type: Number, // time in milliseconds
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    date: {
        type: Date,
        default: Date.now
    }
});

TrackmaniaRunSchema.index({ player: 1, map: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('TrackmaniaRun', TrackmaniaRunSchema);

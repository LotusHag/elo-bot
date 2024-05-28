// models/trackmaniaRun.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TrackmaniaRunSchema = new Schema({
    player: { type: Schema.Types.ObjectId, ref: 'PlayerTrackmania', required: true },
    map: { type: Schema.Types.ObjectId, ref: 'TrackmaniaMap', required: true },
    time: { type: Number, required: true }, // time in milliseconds
    verified: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});

TrackmaniaRunSchema.index({ player: 1, map: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('TrackmaniaRun', TrackmaniaRunSchema);

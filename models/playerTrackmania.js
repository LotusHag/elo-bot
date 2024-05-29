const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlayerTrackmaniaSchema = new Schema({
    name: { type: String, required: true, unique: true },
    totalElo: { type: Number, default: 1000 }
});

module.exports = mongoose.model('PlayerTrackmania', PlayerTrackmaniaSchema);

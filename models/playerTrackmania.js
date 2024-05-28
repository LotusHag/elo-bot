// models/playerTrackmania.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const playerTrackmaniaSchema = new Schema({
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    elo: { type: Number, default: 0 }
});

module.exports = mongoose.model('PlayerTrackmania', playerTrackmaniaSchema);

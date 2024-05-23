// models/game.js
const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    roles: {
        type: [String],
        default: []
    }
});

module.exports = mongoose.model('Game', GameSchema);

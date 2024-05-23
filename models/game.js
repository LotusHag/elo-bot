const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    description: { type: String }
});

module.exports = mongoose.model('Game', gameSchema);

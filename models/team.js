const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    elo: {
        type: Number,
        default: 1000,
    },
    wins: {
        type: Number,
        default: 0,
    },
    losses: {
        type: Number,
        default: 0,
    },
});

teamSchema.statics.findOrCreate = async function (teamName) {
    let team = await this.findOne({ name: teamName.toLowerCase() });
    if (!team) {
        team = await this.create({ name: teamName.toLowerCase() });
    }
    return team;
};

module.exports = mongoose.model('Team', teamSchema);

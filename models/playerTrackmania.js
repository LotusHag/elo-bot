const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const playerTrackmaniaSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    game: {
        type: Schema.Types.ObjectId,
        ref: 'Game',
        required: true
    },
    time: {
        type: Number, // Time in milliseconds
        required: true
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    map: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PlayerTrackmania', playerTrackmaniaSchema);

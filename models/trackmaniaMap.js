const mongoose = require('mongoose');

const TrackmaniaMapSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
});

module.exports = mongoose.model('TrackmaniaMap', TrackmaniaMapSchema);

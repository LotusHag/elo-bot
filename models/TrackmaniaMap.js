const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TrackmaniaMapSchema = new Schema({
    name: { type: String, required: true },
    status: { type: String, required: true, enum: ['active', 'inactive'] }
});

module.exports = mongoose.model('TrackmaniaMap', TrackmaniaMapSchema);

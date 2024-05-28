const mongoose = require('mongoose');
const TrackmaniaMap = require('../models/trackmaniaMap');

mongoose.connect('mongodb://localhost:27017/eloDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Error connecting to MongoDB', err);
});

const maps = [
    {
        name: '2021 Summer 24',
        status: 'active'
    }
];

async function populateMaps() {
    try {
        await TrackmaniaMap.insertMany(maps);
        console.log('Maps populated successfully');
    } catch (error) {
        console.error('Error populating maps:', error);
    } finally {
        mongoose.connection.close();
    }
}

populateMaps();

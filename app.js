const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = 3000;

mongoose.connect('mongodb://localhost/eloDB', {}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const indexRouter = require('./routes/index');
const playersRouter = require('./routes/players');
const teamsRouter = require('./routes/teams');
const customGameRouter = require('./routes/custom-game');

app.use('/', indexRouter);
app.use('/players', playersRouter);
app.use('/teams', teamsRouter);
app.use('/custom-game', customGameRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

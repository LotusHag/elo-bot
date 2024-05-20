const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = 3000;

mongoose.connect('mongodb://localhost/eloDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const indexRouter = require('./routes/index');
const playersRouter = require('./routes/players');
const teamsRouter = require('./routes/teams');

app.use('/', indexRouter);
app.use('/players', playersRouter);
app.use('/teams', teamsRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

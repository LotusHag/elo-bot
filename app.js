const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('./config/passport');

const app = express();
const PORT = 3001;

mongoose.connect('mongodb://localhost/eloDB', {}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const indexRouter = require('./routes/index');
const playersRouter = require('./routes/players');
const customGameRouter = require('./routes/custom-game');
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const gamesRouter = require('./routes/games');

app.use('/', indexRouter);
app.use('/players', playersRouter);
app.use('/custom-game', customGameRouter);
app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/games', gamesRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

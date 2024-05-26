// routes/auth.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');

router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const newUser = new User({ username, password, role });
        await newUser.save();
        res.redirect('/auth/login');
    } catch (err) {
        console.error(err);
        res.redirect('/auth/register');
    }
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/auth/login',
    failureFlash: true
}));

router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/auth/login');
    });
});

module.exports = router;

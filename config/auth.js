// config/auth.js
module.exports.ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login');
};

module.exports.ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && (req.user.role === 'general admin' || req.user.role === 'head admin')) {
        return next();
    }
    res.redirect('/auth/login');
};

module.exports.ensureHeadAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'head admin') {
        return next();
    }
    res.redirect('/auth/login');
};

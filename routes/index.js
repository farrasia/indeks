var express = require('express');
var router = express.Router();
var auth = require('../middleware/auth');
var authRoutes = require('./auth');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// redirect legacy/misspelled /assesment to canonical /assessment
router.get('/assesment', auth.ensureAuth, function(req, res, next) {
  return res.redirect('/assessment');
});

router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Express' });
});

router.get('/register', function(req, res, next) {
  res.render('register', { title: 'Register' });
});

// allow the register form to POST to /register (in addition to /auth/register)
router.post('/register', ...authRoutes.registerMiddleware);
// allow the login form to POST to /login (in addition to /auth/login)
router.post('/login', ...authRoutes.loginMiddleware);

router.get('/logout', function(req, res, next) {
  if (req.session) {
    // remove authenticated user from session but keep the session
    // object so `connect-flash` can store the flash message
    if (req.session.user) delete req.session.user;
    if (req.flash) req.flash('success', 'You have been logged out');
    return res.redirect('/login');
  } else {
    return res.redirect('/login');
  }
});

// Development helper: show current session user (including role)
if (process.env.NODE_ENV !== 'production') {
  router.get('/whoami', function(req, res) {
    res.json({ user: req.session ? req.session.user : null });
  });
}

module.exports = router;

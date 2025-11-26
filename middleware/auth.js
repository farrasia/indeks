module.exports = {
  ensureAuth: function (req, res, next) {
    if (req.session && req.session.user) return next();
    if (req.flash) req.flash('error', 'You must be logged in to access that page');
    return res.redirect('/login');
  },
  ensureGuest: function (req, res, next) {
    if (!req.session || !req.session.user) return next();
    return res.redirect('/');
  }
  ,
  ensureAdmin: function (req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') return next();
    if (req.flash) req.flash('error', 'Admin access required');
    return res.redirect('/');
  }
};


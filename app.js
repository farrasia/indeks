var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var flash = require('connect-flash');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var assessmentRouter = require('./routes/assessment');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// session (server-side memory store) - suitable for development only
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set to true if you use HTTPS
}));
// flash messages (depends on sessions)
app.use(flash());

// expose flash messages and current user to views
app.use(function (req, res, next) {
  res.locals.currentUser = req.session && req.session.user;
  res.locals.success = req.flash('success') || [];
  res.locals.error = req.flash('error') || [];
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/assessment', assessmentRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // log the error to the server console for debugging (include request info)
  try {
    console.error('Unhandled error on %s %s', req.method, req.originalUrl, err && err.stack ? '\n' + err.stack : err);
  } catch (logErr) {
    // if logging itself fails, still proceed to render the error page
    console.error('Error while logging error:', logErr);
  }

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const HASH_ITERATIONS = 310000;
const HASH_KEYLEN = 32;
const HASH_DIGEST = 'sha256';

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('hex');
    return `${salt}$${HASH_ITERATIONS}$${derived}`;
}

function verifyPassword(password, stored) {
    try {
        const [salt, iterationsStr, hash] = stored.split('$');
        const iterations = parseInt(iterationsStr, 10);
        const derived = crypto.pbkdf2Sync(password, salt, iterations, HASH_KEYLEN, HASH_DIGEST).toString('hex');
        return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
    } catch (err) {
        return false;
    }
}

// Redirect legacy /auth/register to canonical /register
router.get('/register', (req, res) => {
    return res.redirect('/register');
});

const registerValidators = [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Invalid email address').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

async function registerHandler(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(e => e.msg));
        // If this POST came from /register (root), redirect there; otherwise fall back to /auth/register
        const redirectTo = req.originalUrl && req.originalUrl.startsWith('/register') ? '/register' : '/auth/register';
        return res.redirect(redirectTo);
    }
    const { username, email, password } = req.body;
    try {
        const hashed = hashPassword(password);
        const insert = await db.query(
            'INSERT INTO users(username, email, password_hash) VALUES($1, $2, $3) RETURNING id, username, email, role',
            [username, email, hashed]
        );
        const user = insert.rows[0];
        req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role };
        req.flash('success', 'Registered successfully');
        res.redirect('/assessment');
    } catch (err) {
        if (err.code === '23505') {
            // unique violation
            req.flash('error', 'Username or email already exists');
            const redirectTo = req.originalUrl && req.originalUrl.startsWith('/register') ? '/register' : '/auth/register';
            return res.redirect(redirectTo);
        }
        next(err);
    }
}



// extract login middleware so callers can mount POST /login at other paths
const loginValidators = [
    body('username').trim().notEmpty().withMessage('Username or email is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

async function loginHandler(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(e => e.msg));
        // keep redirect consistent with where the GET login page lives
        const redirectTo = req.originalUrl && req.originalUrl.startsWith('/login') ? '/login' : '/auth/login';
        return res.redirect(redirectTo);
    }
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT id, username, email, password_hash, role FROM users WHERE username=$1 OR email=$1 LIMIT 1', [username]);
        const user = result.rows[0];
        if (!user) {
            req.flash('error', 'Invalid credentials');
            const redirectTo = req.originalUrl && req.originalUrl.startsWith('/login') ? '/login' : '/auth/login';
            return res.redirect(redirectTo);
        }
        const ok = verifyPassword(password, user.password_hash);
        if (!ok) {
            req.flash('error', 'Invalid credentials');
            const redirectTo = req.originalUrl && req.originalUrl.startsWith('/login') ? '/login' : '/auth/login';
            return res.redirect(redirectTo);
        }
        req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role };
        req.flash('success', 'Logged in successfully');
        res.redirect('/assessment');
    } catch (err) {
        next(err);
    }
}

// Redirect legacy /auth/login to canonical /login
router.get('/login', (req, res) => {
    return res.redirect('/login');
});

// keep logout here (mounted at /auth/logout)
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

module.exports = router;
// expose the register middleware so other routers can mount POST /register
module.exports.registerMiddleware = [...registerValidators, registerHandler];
// expose login middleware so other routers can mount POST /login
module.exports.loginMiddleware = [...loginValidators, loginHandler];

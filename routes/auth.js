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

router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register',
    [
        body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
        body('email').isEmail().withMessage('Invalid email address').normalizeEmail(),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array().map(e => e.msg));
            return res.redirect('/auth/register');
        }
        const { username, email, password } = req.body;
        try {
            const hashed = hashPassword(password);
            const insert = await db.query(
                'INSERT INTO users(username, email, password_hash) VALUES($1, $2, $3) RETURNING id, username, email',
                [username, email, hashed]
            );
            const user = insert.rows[0];
            req.session.user = { id: user.id, username: user.username, email: user.email };
            req.flash('success', 'Registered successfully');
            res.redirect('/');
        } catch (err) {
            if (err.code === '23505') {
                // unique violation
                req.flash('error', 'Username or email already exists');
                return res.redirect('/auth/register');
            }
            next(err);
        }
    }
);

router.post('/login',
    [
        body('username').trim().notEmpty().withMessage('Username or email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array().map(e => e.msg));
            return res.redirect('/login');
        }
        const { username, password } = req.body;
        try {
            const result = await db.query('SELECT id, username, email, password_hash FROM users WHERE username=$1 OR email=$1 LIMIT 1', [username]);
            const user = result.rows[0];
            if (!user) {
                req.flash('error', 'Invalid credentials');
                return res.redirect('/login');
            }
            const ok = verifyPassword(password, user.password_hash);
            if (!ok) {
                req.flash('error', 'Invalid credentials');
                return res.redirect('/login');
            }
            req.session.user = { id: user.id, username: user.username, email: user.email };
            req.flash('success', 'Logged in successfully');
            res.redirect('/');
        } catch (err) {
            next(err);
        }
    }
);

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

module.exports = router;

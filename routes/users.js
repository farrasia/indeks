const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { ensureAuth, ensureAdmin } = require('../middleware/auth');

const HASH_ITERATIONS = 310000;
const HASH_KEYLEN = 32;
const HASH_DIGEST = 'sha256';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('hex');
  return `${salt}$${HASH_ITERATIONS}$${derived}`;
}

// List users with search, pagination, sorting
router.get('/', ensureAdmin, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = Math.max(1, parseInt(req.query.perPage || '10', 10));
    const sort = ['username','email','created_at'].includes(req.query.sort) ? req.query.sort : 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const where = [];
    const params = [];
    if (q) {
      params.push(`%${q}%`, `%${q}%`);
      where.push(`(username ILIKE $${params.length-1} OR email ILIKE $${params.length})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM users ${whereSql}`, params);
    const total = countRes.rows[0].total || 0;
    const offset = (page - 1) * perPage;

    params.push(perPage, offset);
    const usersRes = await db.query(
      `SELECT id, username, email, created_at, role FROM users ${whereSql} ORDER BY ${sort} ${order} LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );

    res.render('users/index', {
      users: usersRes.rows,
      page,
      perPage,
      total,
      q,
      sort,
      order
    });
  } catch (err) {
    next(err);
  }
});

// Show create form
router.get('/new', ensureAdmin, (req, res) => {
  res.render('users/new');
});

// Create user
router.post('/create', ensureAdmin,
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username at least 3 chars'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password at least 6 chars')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array().map(e => e.msg));
      return res.redirect('/users/new');
    }
    const { username, email, password, role } = req.body;
    try {
      const hashed = hashPassword(password);
      await db.query('INSERT INTO users(username, email, password_hash, role) VALUES($1,$2,$3,$4)', [username, email, hashed, role || 'user']);
      req.flash('success', 'User created');
      res.redirect('/users');
    } catch (err) {
      if (err.code === '23505') {
        req.flash('error', 'Username or email already exists');
        return res.redirect('/users/new');
      }
      next(err);
    }
  }
);

// Edit form
router.get('/:id/edit', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id,10);
    const r = await db.query('SELECT id, username, email, created_at, role FROM users WHERE id=$1', [id]);
    if (!r.rows.length) return res.status(404).send('User not found');
    res.render('users/edit', { user: r.rows[0] });
  } catch (err) { next(err); }
});

// Update user
router.post('/:id/update', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id,10);
    const { username, email, password, role } = req.body;
    if (!username || !email) {
      req.flash('error', 'Username and email required');
      return res.redirect(`/users/${id}/edit`);
    }
    if (password && password.length > 0) {
      const hashed = hashPassword(password);
      await db.query('UPDATE users SET username=$1, email=$2, password_hash=$3, role=$4 WHERE id=$5', [username, email, hashed, role || 'user', id]);
    } else {
      await db.query('UPDATE users SET username=$1, email=$2, role=$3 WHERE id=$4', [username, email, role || 'user', id]);
    }
    req.flash('success', 'User updated');
    res.redirect('/users');
  } catch (err) {
    if (err.code === '23505') {
      req.flash('error', 'Username or email already exists');
      return res.redirect(`/users/${req.params.id}/edit`);
    }
    next(err);
  }
});

// Delete user
router.post('/:id/delete', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id,10);
    await db.query('DELETE FROM users WHERE id=$1', [id]);
    req.flash('success', 'User deleted');
    res.redirect('/users');
  } catch (err) { next(err); }
});

// Promote user to admin (admin-only)
router.post('/:id/promote', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.query('UPDATE users SET role=$1 WHERE id=$2', ['admin', id]);
    req.flash('success', 'User promoted to admin');
    res.redirect('/users');
  } catch (err) { next(err); }
});

// Show user
router.get('/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id,10);
    const r = await db.query('SELECT id, username, email, created_at FROM users WHERE id=$1', [id]);
    if (!r.rows.length) return res.status(404).send('User not found');
    res.render('users/show', { user: r.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;

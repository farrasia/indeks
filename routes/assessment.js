const express = require('express');
const router = express.Router();
const db = require('../db');
const { ensureAuth } = require('../middleware/auth');

// GET assessment page
router.get('/', ensureAuth, async (req, res, next) => {
  try {
    // load categories, aspects, criteria
    const cats = await db.query('SELECT id, code, name FROM categories ORDER BY id');
    const aspects = await db.query('SELECT id, category_id, code, name FROM aspects ORDER BY id');
    const criteria = await db.query('SELECT id, aspect_id, code, description, explanation, weight FROM criteria ORDER BY id');

    // build nested structure
    const categories = cats.rows.map(c => ({ ...c, aspects: [] }));
    const aspectsMap = {};
    aspects.rows.forEach(a => {
      const asObj = { ...a, criteria: [] };
      aspectsMap[a.id] = asObj;
      const cat = categories.find(x => x.id === a.category_id);
      if (cat) cat.aspects.push(asObj);
    });
    criteria.rows.forEach(cr => {
      const a = aspectsMap[cr.aspect_id];
      if (a) a.criteria.push(cr);
    });

    res.render('assesment', { categories });
  } catch (err) {
    next(err);
  }
});

// GET history for current user
router.get('/history', ensureAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    // total possible weight (same for all assessments)
    const totalRes = await db.query('SELECT SUM(weight) AS total_weight FROM criteria');
    const totalPossible = parseFloat(totalRes.rows[0].total_weight) || 0;

    const rows = await db.query(
      `SELECT a.id, a.created_at, COALESCE(SUM(ans.score),0) AS total_score
       FROM assessments a
       LEFT JOIN assessment_answers ans ON ans.assessment_id = a.id
       WHERE a.user_id = $1
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [userId]
    );

    const items = rows.rows.map(r => {
      const total = parseFloat(r.total_score) || 0;
      const pct = totalPossible > 0 ? (total / totalPossible) * 100 : 0;
      let rating = 'Poor';
      if (pct > 75) rating = 'Excellent';
      else if (pct >= 50) rating = 'Good';
      return { id: r.id, created_at: r.created_at, total, pct: Math.round(pct*100)/100, rating };
    });

    res.render('assessment_history', { items });
  } catch (err) {
    next(err);
  }
});

// GET detailed result for a specific assessment
router.get('/result/:id', ensureAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const assessmentId = parseInt(req.params.id, 10);
    const ares = await db.query('SELECT id, user_id, created_at FROM assessments WHERE id=$1 AND user_id=$2', [assessmentId, userId]);
    if (!ares.rows.length) return res.status(404).send('Assessment not found');

    const answers = await db.query(
      `SELECT ca.code as aspect_code, c.code as criteria_code, c.description, c.explanation, c.weight, ans.answer, ans.score
       FROM assessment_answers ans
       JOIN criteria c ON c.id = ans.criteria_id
       JOIN aspects ca ON ca.id = c.aspect_id
       WHERE ans.assessment_id = $1
       ORDER BY ca.id, c.id`,
      [assessmentId]
    );

    const totalPossibleRes = await db.query('SELECT SUM(weight) AS total_weight FROM criteria');
    const totalPossible = parseFloat(totalPossibleRes.rows[0].total_weight) || 0;
    const totalScore = answers.rows.reduce((s, r) => s + parseFloat(r.score || 0), 0);
    const pct = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
    let rating = 'Poor';
    if (pct > 75) rating = 'Excellent';
    else if (pct >= 50) rating = 'Good';

    res.render('assessment_result', { assessment: ares.rows[0], answers: answers.rows, totalScore, totalPossible, pct: Math.round(pct*100)/100, rating });
  } catch (err) {
    next(err);
  }
});

// POST submit answers
router.post('/submit', ensureAuth, async (req, res, next) => {
  const answers = req.body.answers || {};
  const userId = req.session.user.id;
  const client = db.pool;
  const conn = await client.connect();
  try {
    console.log('Saving assessment for user:', userId, 'answers keys:', Object.keys(answers).length);
    await conn.query('BEGIN');
    const r = await conn.query('INSERT INTO assessments(user_id) VALUES($1) RETURNING id', [userId]);
    const assessmentId = r.rows[0].id;

    const inserts = [];
    for (const [critIdStr, val] of Object.entries(answers)) {
      const critId = parseInt(critIdStr, 10);
      if (Number.isNaN(critId)) {
        throw new Error('Invalid criteria id: ' + critIdStr);
      }
      const answer = val === '1' ? 1 : 0;
      // get weight
      const wres = await conn.query('SELECT weight FROM criteria WHERE id=$1', [critId]);
      if (!wres.rows || !wres.rows[0]) {
        throw new Error('Criteria not found: ' + critId);
      }
      const weight = parseFloat(wres.rows[0].weight) || 0;
      const score = (answer * weight);
      inserts.push(conn.query('INSERT INTO assessment_answers(assessment_id, criteria_id, answer, score) VALUES($1,$2,$3,$4)', [assessmentId, critId, answer, score]));
    }
    await Promise.all(inserts);
    await conn.query('COMMIT');
    req.flash('success', 'Assessment saved');
    return res.redirect('/assessment');
  } catch (err) {
    try { await conn.query('ROLLBACK'); } catch (e) { console.error('Rollback failed', e); }
    console.error('Failed to save assessment for user', req.session && req.session.user && req.session.user.id, err);
    if (req.flash) req.flash('error', 'Failed to save assessment. Please try again.');
    return res.redirect('/assessment');
  } finally {
    conn.release();
  }
});

module.exports = router;

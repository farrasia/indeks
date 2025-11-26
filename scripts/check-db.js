#!/usr/bin/env node
require('dotenv').config();
const db = require('../db');

(async function(){
  console.log('Testing DB connection using environment configuration...');
  try {
    const res = await db.query('SELECT NOW() AS now');
    console.log('OK: connected to database. Server time:', res.rows[0].now);

    // Try a simple users count if the table exists
    try {
      const r2 = await db.query('SELECT COUNT(*)::int AS cnt FROM users');
      console.log('Users table exists. Count:', r2.rows[0].cnt);
    } catch (innerErr) {
      console.warn('Warning: cannot query `users` table (it may not exist):', innerErr.message);
    }

    process.exit(0);
  } catch (err) {
    console.error('ERROR: Unable to connect / query database:', err && err.stack ? err.stack : err);
    process.exit(2);
  }
})();

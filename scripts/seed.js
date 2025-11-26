#!/usr/bin/env node
require('dotenv').config();
const db = require('../db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HASH_ITERATIONS = 310000;
const HASH_KEYLEN = 32;
const HASH_DIGEST = 'sha256';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('hex');
  return `${salt}$${HASH_ITERATIONS}$${derived}`;
}

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  // run sql as a single query (multiple statements allowed)
  await db.query(sql);
}

async function main() {
  try {
    console.log('Running SQL init...');
    await runSqlFile(path.join(__dirname, '..', 'sql', 'init.sql'));
    // assessment tables and data
    console.log('Running assessment SQL...');
    await runSqlFile(path.join(__dirname, '..', 'sql', 'assessment_init.sql'));
    console.log('Tables ensured.');

    const adminUser = process.env.ADMIN_USERNAME;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminUser && adminEmail && adminPassword) {
      // check if admin exists
      const res = await db.query('SELECT id FROM users WHERE username=$1 OR email=$2 LIMIT 1', [adminUser, adminEmail]);
      if (res.rows.length) {
        console.log('Admin user already exists, skipping creation.');
      } else {
        console.log('Creating admin user...');
        const hashed = hashPassword(adminPassword);
        await db.query('INSERT INTO users(username, email, password_hash, role) VALUES($1, $2, $3, $4)', [adminUser, adminEmail, hashed, 'admin']);
        console.log('Admin user created:', adminUser, adminEmail);
      }
    } else {
      console.log('ADMIN_USERNAME/ADMIN_EMAIL/ADMIN_PASSWORD not fully set — skipping admin creation.');
    }

    console.log('Seed finished.');
    console.log(`You can now log in with username: ${adminUser}, email: ${adminEmail}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

main();

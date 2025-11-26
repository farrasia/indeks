#!/usr/bin/env node
// Usage: node scripts/promote.js --id 3
//        node scripts/promote.js --username alice
//        node scripts/promote.js --email alice@example.com

require('dotenv').config();
const db = require('../db');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--id') out.id = args[++i];
    else if (a === '--username') out.username = args[++i];
    else if (a === '--email') out.email = args[++i];
    else if (a === '--help' || a === '-h') {
      out.help = true;
    }
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  if (opts.help || (!opts.id && !opts.username && !opts.email)) {
    console.log('Usage: node scripts/promote.js --id <id> | --username <username> | --email <email>');
    process.exit(0);
  }

  try {
    let res;
    if (opts.id) {
      const id = parseInt(opts.id, 10);
      res = await db.query('UPDATE users SET role=$1 WHERE id=$2 RETURNING id, username, email, role', ['admin', id]);
    } else if (opts.username) {
      res = await db.query('UPDATE users SET role=$1 WHERE username=$2 RETURNING id, username, email, role', ['admin', opts.username]);
    } else if (opts.email) {
      res = await db.query('UPDATE users SET role=$1 WHERE email=$2 RETURNING id, username, email, role', ['admin', opts.email]);
    }

    if (res && res.rows && res.rows.length) {
      const u = res.rows[0];
      console.log(`Promoted user: id=${u.id} username=${u.username} email=${u.email} role=${u.role}`);
      process.exit(0);
    } else {
      console.error('No user found or nothing changed.');
      process.exit(2);
    }
  } catch (err) {
    console.error('Failed to promote user:', err.message || err);
    process.exit(1);
  }
}

main();

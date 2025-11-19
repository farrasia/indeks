require('dotenv').config();
const { Pool } = require('pg');

// Configure via environment variables: PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT or DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};

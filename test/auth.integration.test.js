const request = require('supertest');
const { expect } = require('chai');
const crypto = require('crypto');

// create a mock db before loading the app so modules that require ../db get the mock
const mockDb = (() => {
  const users = [];
  let nextId = 1;
  return {
    query: async (text, params) => {
      const sql = (text || '').toLowerCase();
      if (sql.startsWith('insert into users')) {
        const username = params[0];
        const email = params[1];
        const password_hash = params[2];
        const user = { id: nextId++, username, email, role: 'user', password_hash };
        users.push(user);
        return { rows: [user] };
      }
      if (sql.startsWith('select id, username, email, password_hash, role from users')) {
        const q = params[0];
        const found = users.find(u => u.username === q || u.email === q);
        return { rows: found ? [found] : [] };
      }
      // fallback: return empty
      return { rows: [] };
    }
  };
})();

// inject into require cache
const Module = require('module');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'db.js');
require.cache[require.resolve(dbPath)] = { exports: mockDb };

// helper to create the same password hash as the app
function hashPassword(password) {
  const HASH_ITERATIONS = 310000;
  const HASH_KEYLEN = 32;
  const HASH_DIGEST = 'sha256';
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('hex');
  return `${salt}$${HASH_ITERATIONS}$${derived}`;
}

const app = require('../app');

describe('Integration: /register and /login', function() {
  it('POST /register should create a user and redirect to /', async function() {
    const agent = request.agent(app);
    const res = await agent
      .post('/register')
      .type('form')
      .send({ username: 'alice', email: 'alice@example.com', password: 'secret123' });
    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal('/assessment');
  });

  it('POST /login should authenticate existing user and redirect to /', async function() {
    // pre-seed a user into mockDb with a hashed password
    const password = 'hunter2';
    const storedHash = hashPassword(password);
    // directly call mockDb to emulate an existing user insert
    await mockDb.query('INSERT INTO users(username,email,password_hash) VALUES($1,$2,$3) RETURNING id', ['bob', 'bob@example.com', storedHash]);

    const agent = request.agent(app);
    const res = await agent
      .post('/login')
      .type('form')
      .send({ username: 'bob', password });

    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal('/assessment');
  });
});

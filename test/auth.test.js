const request = require('supertest');
const { expect } = require('chai');
const app = require('../app');

describe('Auth routing and canonical URLs', function() {
  it('redirects /auth/login -> /login', async function() {
    const res = await request(app).get('/auth/login');
    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal('/login');
  });

  it('redirects /auth/register -> /register', async function() {
    const res = await request(app).get('/auth/register');
    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal('/register');
  });

  it('serves GET /login (200)', async function() {
    const res = await request(app).get('/login');
    expect(res.status).to.equal(200);
  });

  it('serves GET /register (200)', async function() {
    const res = await request(app).get('/register');
    expect(res.status).to.equal(200);
  });
});

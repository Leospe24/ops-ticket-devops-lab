const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/middleware/auth');

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('creates a new user with bcrypt-hashed password and returns user without password_hash', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'SecurePass123!' });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.role).toBe('user');
      expect(res.body.user.password_hash).toBeUndefined();
      expect(res.body.user.id).toBeDefined();

      // Verify hash was stored in DB
      const dbUser = await db('users')
        .where({ email: 'test@example.com' })
        .first();
      expect(dbUser).toBeDefined();
      expect(dbUser.password_hash).not.toBe('SecurePass123!');
      expect(dbUser.password_hash).toMatch(/^\$2[aby]\$/); // bcrypt prefix
    });

    it('rejects registration with an existing email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@example.com', password: 'SecurePass123!' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@example.com', password: 'AnotherPass456!' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already registered/i);
    });

    it('rejects invalid roles', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'badrole@example.com', password: 'SecurePass123!', role: 'hacker' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid role/i);
    });

    it('rejects missing email or password', async () => {
      const res1 = await request(app)
        .post('/api/auth/register')
        .send({ password: 'SecurePass123!' });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/auth/register')
        .send({ email: 'missingpass@example.com' });
      expect(res2.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'login@example.com', password: 'LoginPass123!' });
    });

    it('returns a valid JWT token on successful login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'LoginPass123!' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('login@example.com');
      expect(res.body.user.password_hash).toBeUndefined();

      const decoded = jwt.verify(res.body.token, JWT_SECRET);
      expect(decoded.email).toBe('login@example.com');
      expect(decoded.role).toBeDefined();
      expect(decoded.id).toBeDefined();
    });

    it('rejects invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'WrongPass!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid credentials/i);
    });

    it('rejects non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'AnyPass!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid credentials/i);
    });

    it('rejects missing email or password', async () => {
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({ password: 'SomePass!' });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com' });
      expect(res2.status).toBe(400);
    });
  });
});

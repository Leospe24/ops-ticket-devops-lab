const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const SALT_ROUNDS = 12;

function sanitizeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

/**
 * POST /api/auth/register
 * Body: { email, password, role? }
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, role = 'user' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (!['admin', 'engineer', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, engineer, or user.' });
    }

    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db('users')
      .insert({ email, password_hash: passwordHash, role })
      .returning('*');

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const db = require('./db');
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  throw new Error('FRONTEND_URL environment variable is required');
}

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Skip rate limiting in test environment to allow test suites to run
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/auth', authRateLimit);
}
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);

app.get('/health', async (_req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'UP', database: 'CONNECTED' });
  } catch (err) {
    res.status(503).json({ status: 'DOWN', reason: 'Database unreachable' });
  }
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

module.exports = app;

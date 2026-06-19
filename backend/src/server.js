require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const app = require('./app');
const db = require('./db');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`OpsTicket API listening on port ${PORT}`);
});

const shutdown = async () => {
  console.log('Shutting down gracefully...');
  server.close(async () => {
    await db.destroy();
    console.log('Database connections closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

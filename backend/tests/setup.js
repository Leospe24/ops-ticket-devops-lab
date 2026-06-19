const db = require('../src/db');

beforeAll(async () => {
  await db.migrate.latest();
});

afterEach(async () => {
  await db('tickets').del();
  await db('users').del();
});

afterAll(async () => {
  await db.destroy();
});

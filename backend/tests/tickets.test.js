const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/middleware/auth');

// Helpers
async function createUser(data) {
  const res = await request(app).post('/api/auth/register').send(data);
  return res.body.user;
}

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

async function createTicket(token, data) {
  const res = await request(app)
    .post('/api/tickets')
    .set('Authorization', `Bearer ${token}`)
    .send(data);
  return res.body.ticket;
}

describe('Ticket Endpoints', () => {
  let admin, engineer, userA, userB;
  let adminToken, engineerToken, userAToken, userBToken;
  let counter = 0;

  beforeEach(async () => {
    counter += 1;
    admin = await createUser({ email: `admin_${counter}@test.com`, password: 'Pass123!', role: 'admin' });
    engineer = await createUser({ email: `engineer_${counter}@test.com`, password: 'Pass123!', role: 'engineer' });
    userA = await createUser({ email: `usera_${counter}@test.com`, password: 'Pass123!', role: 'user' });
    userB = await createUser({ email: `userb_${counter}@test.com`, password: 'Pass123!', role: 'user' });

    adminToken = makeToken(admin);
    engineerToken = makeToken(engineer);
    userAToken = makeToken(userA);
    userBToken = makeToken(userB);
  });

  describe('Authentication', () => {
    it('rejects requests without a token', async () => {
      const res = await request(app).get('/api/tickets');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/no token/i);
    });

    it('rejects requests with an invalid token', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/invalid or expired/i);
    });
  });

  describe('POST /api/tickets', () => {
    it('creates a ticket with auto-generated ID', async () => {
      const ticket = await createTicket(userAToken, {
        title: 'First Ticket',
        description: 'Something is broken',
        priority: 'high',
      });

      expect(ticket).toBeDefined();
      expect(typeof ticket.id).toBe('number');
      expect(ticket.id).toBeGreaterThan(0);
      expect(ticket.title).toBe('First Ticket');
      expect(ticket.priority).toBe('high');
      expect(ticket.status).toBe('open');
      expect(ticket.creator_id).toBe(userA.id);
    });

    it('rejects missing fields', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: 'Only title' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('rejects invalid priority', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: 'T', description: 'D', priority: 'urgent' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid priority/i);
    });

    it('rejects invalid assignee', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: 'T', description: 'D', priority: 'low', assignee_id: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee not found/i);
    });

    it('allows setting a valid assignee', async () => {
      const ticket = await createTicket(userAToken, {
        title: 'Assigned ticket',
        description: 'Desc',
        priority: 'medium',
        assignee_id: engineer.id,
      });

      expect(ticket.assignee_id).toBe(engineer.id);
    });
  });

  describe('GET /api/tickets', () => {
    beforeEach(async () => {
      // Create a few tickets
      await createTicket(userAToken, { title: 'UA1', description: 'D', priority: 'low' });
      await createTicket(userAToken, { title: 'UA2', description: 'D', priority: 'critical' });
      await createTicket(userBToken, { title: 'UB1', description: 'D', priority: 'medium' });
      await createTicket(userBToken, { title: 'UB2', description: 'D', priority: 'high', assignee_id: engineer.id });
    });

    it('admin sees all tickets', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBeGreaterThanOrEqual(4);
    });

    it('user sees only their created tickets', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.every(t => t.creator_id === userA.id)).toBe(true);
      expect(res.body.tickets.length).toBe(2);
    });

    it('engineer sees only assigned tickets', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${engineerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.every(t => t.assignee_id === engineer.id)).toBe(true);
      expect(res.body.tickets.length).toBe(1);
    });

    it('filters by status query param', async () => {
      const res = await request(app)
        .get('/api/tickets?status=open')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.every(t => t.status === 'open')).toBe(true);
    });

    it('filters by priority query param', async () => {
      const res = await request(app)
        .get('/api/tickets?priority=critical')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.every(t => t.priority === 'critical')).toBe(true);
    });
  });

  describe('PUT /api/tickets/:id', () => {
    let ticket;

    beforeEach(async () => {
      ticket = await createTicket(userAToken, { title: 'Update me', description: 'D', priority: 'low' });
    });

    it('updates status and priority', async () => {
      const res = await request(app)
        .put(`/api/tickets/${ticket.id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'in-progress', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe('in-progress');
      expect(res.body.ticket.priority).toBe('high');
    });

    it('updates assignee', async () => {
      const res = await request(app)
        .put(`/api/tickets/${ticket.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignee_id: engineer.id });

      expect(res.status).toBe(200);
      expect(res.body.ticket.assignee_id).toBe(engineer.id);
    });

    it('removes assignee when null is sent', async () => {
      await request(app)
        .put(`/api/tickets/${ticket.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignee_id: engineer.id });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignee_id: null });

      expect(res.status).toBe(200);
      expect(res.body.ticket.assignee_id).toBeNull();
    });

    it('returns 404 for non-existent ticket', async () => {
      const res = await request(app)
        .put('/api/tickets/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'resolved' });

      expect(res.status).toBe(404);
    });

    it('forbids user from updating another user\'s ticket', async () => {
      const res = await request(app)
        .put(`/api/tickets/${ticket.id}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ status: 'resolved' });

      expect(res.status).toBe(403);
    });

    it('rejects invalid status', async () => {
      const res = await request(app)
        .put(`/api/tickets/${ticket.id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'deleted' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid status/i);
    });
  });

  describe('GET /api/tickets/stats', () => {
    it('returns aggregate counts for admin', async () => {
      const res = await request(app)
        .get('/api/tickets/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.activeTicketsCount).toBe('number');
      expect(typeof res.body.criticalAlertsCount).toBe('number');
      expect(typeof res.body.totalTicketsCount).toBe('number');
      expect(typeof res.body.openTicketsCount).toBe('number');
      expect(typeof res.body.inProgressTicketsCount).toBe('number');
      expect(typeof res.body.resolvedTicketsCount).toBe('number');
    });

    it('filters stats by role', async () => {
      const adminRes = await request(app)
        .get('/api/tickets/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      const userRes = await request(app)
        .get('/api/tickets/stats')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(userRes.body.totalTicketsCount).toBeLessThanOrEqual(adminRes.body.totalTicketsCount);
    });
  });
});

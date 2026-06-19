const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All ticket routes require authentication
router.use(authenticateToken);

/**
 * GET /api/tickets
 * Role-based filtering:
 * - admin: all tickets
 * - engineer: tickets where assignee_id = their id
 * - user: tickets where creator_id = their id
 */
router.get('/', async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;

    let query = db('tickets')
      .leftJoin('users as creator', 'tickets.creator_id', 'creator.id')
      .leftJoin('users as assignee', 'tickets.assignee_id', 'assignee.id')
      .select(
        'tickets.*',
        db.raw("json_build_object('id', creator.id, 'email', creator.email, 'role', creator.role) as creator"),
        db.raw("json_build_object('id', assignee.id, 'email', assignee.email, 'role', assignee.role) as assignee")
      );

    if (role === 'engineer') {
      query = query.where('tickets.assignee_id', userId);
    } else if (role === 'user') {
      query = query.where('tickets.creator_id', userId);
    }
    // admin sees all (no filter)

    // Optional query filters
    const { status, priority } = req.query;
    if (status) {
      query = query.where('tickets.status', status);
    }
    if (priority) {
      query = query.where('tickets.priority', priority);
    }

    const tickets = await query.orderBy('tickets.created_at', 'desc');
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tickets
 * Body: { title, description, priority, status?, assignee_id? }
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, description, priority, status = 'open', assignee_id } = req.body;
    const creator_id = req.user.id;

    if (!title || !description || !priority) {
      return res.status(400).json({ error: 'Title, description, and priority are required.' });
    }

    if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority. Must be low, medium, high, or critical.' });
    }

    if (!['open', 'in-progress', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be open, in-progress, or resolved.' });
    }

    // Validate assignee exists if provided
    if (assignee_id) {
      const assignee = await db('users').where({ id: assignee_id }).first();
      if (!assignee) {
        return res.status(400).json({ error: 'Assignee not found.' });
      }
    }

    const [ticket] = await db('tickets')
      .insert({
        title,
        description,
        priority,
        status,
        creator_id,
        assignee_id: assignee_id || null,
      })
      .returning('*');

    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tickets/:id
 * Body: { status?, priority?, assignee_id? }
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, assignee_id } = req.body;
    const { role, id: userId } = req.user;

    const ticket = await db('tickets').where({ id }).first();
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    // Authorization: users can only update their own tickets unless admin/engineer
    if (role === 'user' && ticket.creator_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: you can only update tickets you created.' });
    }

    const updates = { updated_at: db.fn.now() };

    if (status !== undefined) {
      if (!['open', 'in-progress', 'resolved'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
      }
      updates.status = status;
    }

    if (priority !== undefined) {
      if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority.' });
      }
      updates.priority = priority;
    }

    if (assignee_id !== undefined) {
      if (assignee_id) {
        const assignee = await db('users').where({ id: assignee_id }).first();
        if (!assignee) {
          return res.status(400).json({ error: 'Assignee not found.' });
        }
      }
      updates.assignee_id = assignee_id || null;
    }

    const [updated] = await db('tickets')
      .where({ id })
      .update(updates)
      .returning('*');

    res.json({ ticket: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tickets/stats
 * Aggregate data for dashboard
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;

    let baseQuery = db('tickets');

    if (role === 'engineer') {
      baseQuery = baseQuery.where('assignee_id', userId);
    } else if (role === 'user') {
      baseQuery = baseQuery.where('creator_id', userId);
    }

    const activeTicketsCount = parseInt(
      await baseQuery.clone().whereNot('status', 'resolved').count('id as count').first().then(r => r.count),
      10
    );

    const criticalAlertsCount = parseInt(
      await baseQuery.clone().where({ priority: 'critical' }).whereNot('status', 'resolved').count('id as count').first().then(r => r.count),
      10
    );

    const totalTicketsCount = parseInt(
      await baseQuery.clone().count('id as count').first().then(r => r.count),
      10
    );

    const openTicketsCount = parseInt(
      await baseQuery.clone().where({ status: 'open' }).count('id as count').first().then(r => r.count),
      10
    );

    const inProgressTicketsCount = parseInt(
      await baseQuery.clone().where({ status: 'in-progress' }).count('id as count').first().then(r => r.count),
      10
    );

    const resolvedTicketsCount = parseInt(
      await baseQuery.clone().where({ status: 'resolved' }).count('id as count').first().then(r => r.count),
      10
    );

    res.json({
      activeTicketsCount,
      criticalAlertsCount,
      totalTicketsCount,
      openTicketsCount,
      inProgressTicketsCount,
      resolvedTicketsCount,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

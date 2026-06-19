import React, { useState } from 'react';

const styles = {
  tableWrapper: {
    overflowX: 'auto',
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    color: '#4a5568',
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: '11px',
    letterSpacing: '0.05em',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #edf2f7',
    color: '#2d3748',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priorityColors: {
    low: { background: '#c6f6d5', color: '#22543d' },
    medium: { background: '#feebc8', color: '#744210' },
    high: { background: '#fed7d7', color: '#742a2a' },
    critical: { background: '#feb2b2', color: '#742a2a' },
  },
  statusColors: {
    open: { background: '#e2e8f0', color: '#2d3748' },
    'in-progress': { background: '#bee3f8', color: '#2a4365' },
    resolved: { background: '#c6f6d5', color: '#22543d' },
  },
  select: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #cbd5e0',
    fontSize: '12px',
    cursor: 'pointer',
  },
};

export default function TicketList({ tickets, onUpdate, currentRole }) {
  const [updating, setUpdating] = useState({});

  const handleStatusChange = async (ticketId, newStatus) => {
    setUpdating((prev) => ({ ...prev, [ticketId]: true }));
    try {
      await onUpdate(ticketId, { status: newStatus });
    } finally {
      setUpdating((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  if (!tickets || tickets.length === 0) {
    return (
      <div style={{ ...styles.tableWrapper, padding: '24px', textAlign: 'center', color: '#718096' }}>
        No tickets found.
      </div>
    );
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Title</th>
            <th style={styles.th}>Priority</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Creator</th>
            <th style={styles.th}>Assignee</th>
            <th style={styles.th}>Created</th>
            <th style={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td style={styles.td}>{ticket.id}</td>
              <td style={styles.td}>{ticket.title}</td>
              <td style={styles.td}>
                <span style={{ ...styles.badge, ...styles.priorityColors[ticket.priority] }}>
                  {ticket.priority}
                </span>
              </td>
              <td style={styles.td}>
                <span style={{ ...styles.badge, ...styles.statusColors[ticket.status] }}>
                  {ticket.status}
                </span>
              </td>
              <td style={styles.td}>{ticket.creator?.email || '—'}</td>
              <td style={styles.td}>{ticket.assignee?.email || '—'}</td>
              <td style={styles.td}>
                {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '—'}
              </td>
              <td style={styles.td}>
                {onUpdate ? (
                  <select
                    style={styles.select}
                    value={ticket.status}
                    disabled={updating[ticket.id]}
                    onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

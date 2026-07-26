import React, { useState } from 'react';

const styles = {
  tableWrapper: {
    overflowX: 'auto',
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    border: '1px solid #f1f5f9',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '15px',
  },
  th: {
    textAlign: 'left',
    padding: '16px 24px',
    borderBottom: '1px solid #e2e8f0',
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: '13px',
    letterSpacing: '0.05em',
    background: '#f8fafc',
  },
  td: {
    padding: '20px 24px',
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
  },
  badge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '9999px',
    fontSize: '13px',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  priorityColors: {
    low: { background: '#dcfce7', color: '#166534' },
    medium: { background: '#fef3c7', color: '#92400e' },
    high: { background: '#fee2e2', color: '#991b1b' },
    critical: { background: '#fecaca', color: '#991b1b' },
  },
  statusColors: {
    open: { background: '#f1f5f9', color: '#475569' },
    'in-progress': { background: '#dbeafe', color: '#1e40af' },
    resolved: { background: '#dcfce7', color: '#166534' },
  },
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e0',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none',
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

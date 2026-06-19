import React from 'react';

const styles = {
  banner: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  value: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
    margin: '8px 0',
  },
  label: {
    fontSize: '12px',
    textTransform: 'uppercase',
    color: '#718096',
    letterSpacing: '0.05em',
  },
  critical: {
    color: '#e53e3e',
  },
  active: {
    color: '#dd6b20',
  },
};

export default function StatsBanner({ stats }) {
  if (!stats) return null;

  const items = [
    { label: 'Total Tickets', value: stats.totalTicketsCount || 0 },
    { label: 'Active', value: stats.activeTicketsCount || 0, style: styles.active },
    { label: 'Open', value: stats.openTicketsCount || 0 },
    { label: 'In Progress', value: stats.inProgressTicketsCount || 0 },
    { label: 'Resolved', value: stats.resolvedTicketsCount || 0 },
    { label: 'Critical', value: stats.criticalAlertsCount || 0, style: styles.critical },
  ];

  return (
    <div style={styles.banner}>
      {items.map((item) => (
        <div key={item.label} style={styles.card}>
          <div style={{ ...styles.value, ...(item.style || {}) }}>{item.value}</div>
          <div style={styles.label}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

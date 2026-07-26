import React from 'react';

const styles = {
  banner: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    border: '1px solid #f1f5f9',
    textAlign: 'center',
    transition: 'transform 0.2s',
  },
  value: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '8px 0',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#64748b',
    letterSpacing: '0.05em',
  },
  critical: {
    color: '#ef4444',
  },
  active: {
    color: '#f97316',
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

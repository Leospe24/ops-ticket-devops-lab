import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import StatsBanner from '../components/StatsBanner';
import TicketList from '../components/TicketList';

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a202c',
  },
  button: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    background: '#4a5568',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  newTicketBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    background: '#3182ce',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '8px',
    padding: '24px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    marginBottom: '12px',
    borderRadius: '4px',
    border: '1px solid #cbd5e0',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    marginBottom: '12px',
    borderRadius: '4px',
    border: '1px solid #cbd5e0',
    fontSize: '14px',
    minHeight: '80px',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    marginBottom: '12px',
    borderRadius: '4px',
    border: '1px solid #cbd5e0',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  error: {
    color: '#e53e3e',
    marginBottom: '12px',
    fontSize: '14px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#2d3748',
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'low' });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, ticketsRes] = await Promise.all([
        api.getStats(),
        api.getTickets(),
      ]);
      setStats(statsRes);
      setTickets(ticketsRes.tickets || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
      if (err.status === 401 || err.status === 403) {
        api.logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  const handleUpdateTicket = async (id, updates) => {
    const res = await api.updateTicket(id, updates);
    await fetchData();
    return res;
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.createTicket(form);
      setShowModal(false);
      setForm({ title: '', description: '', priority: 'low' });
      await fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={{ color: '#718096' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>OpsTicket Dashboard</h1>
        <button style={styles.button} onClick={handleLogout}>
          Logout
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <StatsBanner stats={stats} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={styles.sectionTitle}>Tickets</h2>
        <button style={styles.newTicketBtn} onClick={() => setShowModal(true)}>
          + New Ticket
        </button>
      </div>

      <TicketList tickets={tickets} onUpdate={handleUpdateTicket} />

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Create New Ticket</h3>
            {formError && <div style={styles.error}>{formError}</div>}
            <form onSubmit={handleCreateTicket}>
              <input
                style={styles.input}
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <textarea
                style={styles.textarea}
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
              <select
                style={styles.select}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" style={styles.button} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={{ ...styles.newTicketBtn, marginBottom: 0 }} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

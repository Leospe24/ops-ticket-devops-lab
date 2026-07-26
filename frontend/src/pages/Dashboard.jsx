import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import StatsBanner from '../components/StatsBanner';
import TicketList from '../components/TicketList';

const styles = {
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '40px 24px',
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    background: '#f8fafc',
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
  },
  title: {
    margin: 0,
    fontSize: '32px',
    fontWeight: '800',
    color: '#0f172a',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: '#e2e8f0',
    color: '#475569',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  newTicketBtn: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
    transition: 'transform 0.1s, boxShadow 0.1s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '540px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    marginBottom: '16px',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '15px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    marginBottom: '16px',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '15px',
    minHeight: '120px',
    boxSizing: 'border-box',
    resize: 'vertical',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    marginBottom: '24px',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '15px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  error: {
    color: '#e53e3e',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
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

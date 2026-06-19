import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f7fafc',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    marginTop: 0,
    marginBottom: '24px',
    fontSize: '24px',
    fontWeight: '700',
    textAlign: 'center',
    color: '#1a202c',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: '16px',
    borderRadius: '6px',
    border: '1px solid #cbd5e0',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: '16px',
    borderRadius: '6px',
    border: '1px solid #cbd5e0',
    fontSize: '14px',
    boxSizing: 'border-box',
    background: '#fff',
  },
  button: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: 'none',
    background: '#3182ce',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  error: {
    color: '#e53e3e',
    marginBottom: '16px',
    fontSize: '14px',
    textAlign: 'center',
  },
  toggle: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#4a5568',
  },
  link: {
    color: '#3182ce',
    cursor: 'pointer',
    fontWeight: '600',
  },
};

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await api.login({ email, password });
      } else {
        await api.register({ email, password, role });
        await api.login({ email, password });
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>{isLogin ? 'Login' : 'Register'}</h1>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {!isLogin && (
            <select style={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="user">User</option>
              <option value="engineer">Engineer</option>
              <option value="admin">Admin</option>
            </select>
          )}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        <div style={styles.toggle}>
          {isLogin ? (
            <span>
              No account?{' '}
              <span style={styles.link} onClick={() => { setIsLogin(false); setError(null); }}>
                Register
              </span>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <span style={styles.link} onClick={() => { setIsLogin(true); setError(null); }}>
                Login
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

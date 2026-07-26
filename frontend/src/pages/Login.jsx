import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)',
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    padding: '48px',
    width: '100%',
    maxWidth: '460px',
    boxSizing: 'border-box',
  },
  title: {
    marginTop: 0,
    marginBottom: '32px',
    fontSize: '32px',
    fontWeight: '800',
    textAlign: 'center',
    color: '#102a43',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    marginBottom: '20px',
    borderRadius: '8px',
    border: '1px solid #bcccdc',
    backgroundColor: '#f8fafc',
    fontSize: '16px',
    color: '#102a43',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    width: '100%',
    padding: '14px 16px',
    marginBottom: '20px',
    borderRadius: '8px',
    border: '1px solid #bcccdc',
    backgroundColor: '#f8fafc',
    fontSize: '16px',
    color: '#102a43',
    boxSizing: 'border-box',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: '#fff',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    marginBottom: '24px',
    boxShadow: '0 4px 6px rgba(37, 99, 235, 0.25)',
    transition: 'transform 0.1s, boxShadow 0.1s',
  },
  error: {
    color: '#e53e3e',
    marginBottom: '20px',
    fontSize: '15px',
    fontWeight: '600',
    textAlign: 'center',
    background: '#fed7d7',
    padding: '10px',
    borderRadius: '8px',
  },
  toggle: {
    textAlign: 'center',
    fontSize: '15px',
    color: '#4a5568',
  },
  link: {
    color: '#2563eb',
    cursor: 'pointer',
    fontWeight: '700',
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

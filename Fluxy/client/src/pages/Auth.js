import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Icon from '../components/Icon';

export function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.username, form.password);
      navigate(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-screen animate-fade">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px var(--accent-glow)' }}>
            <Icon name="fluxy" size={26} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>Fluxy</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gaming Platform</div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Welcome back</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Sign in to your account</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Username</label>
            <input className="input" placeholder="Enter username" autoComplete="username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} autoFocus />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input className="input" type="password" placeholder="Enter password" autoComplete="current-password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn-primary w-full" style={{ marginTop: 8, justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await register(form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-screen animate-fade">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px var(--accent-glow)' }}>
            <Icon name="fluxy" size={26} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>Fluxy</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gaming Platform</div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Create account</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Join Fluxy for free</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Username</label>
            <input className="input" placeholder="Choose a username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} autoFocus />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input className="input" type="password" placeholder="Choose a password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
          </div>
          <div className="input-group">
            <label className="input-label">Confirm Password</label>
            <input className="input" type="password" placeholder="Repeat password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn-primary w-full" style={{ marginTop: 8, justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}

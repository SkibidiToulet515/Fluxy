import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Icon from '../components/Icon';

const TABS = ['Overview', 'Games', 'Bookmarklets', 'Bypasses'];

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-up">
        <div className="modal-title">
          {title}
          <button className="modal-close" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, API } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [games, setGames] = useState([]);
  const [bookmarklets, setBookmarklets] = useState([]);
  const [bypasses, setBypasses] = useState([]);
  const [modal, setModal] = useState(null); // { type: 'game'|'bm'|'bypass', data: null|obj }
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
  }, [user, navigate]);

  const loadData = useCallback(async () => {
    try {
      const [s, g, b, bp] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/games?limit=5000'),
        API.get('/admin/bookmarklets'),
        API.get('/admin/bypasses'),
      ]);
      const gameRows = Array.isArray(g.data)
        ? g.data
        : Array.isArray(g.data?.games)
          ? g.data.games
          : [];

      setStats(s.data);
      setGames(gameRows);
      setBookmarklets(b.data);
      setBypasses(bp.data);
    } catch {}
  }, [API]);

  useEffect(() => { loadData(); }, [loadData]);

  const openModal = (type, data = null) => {
    const normalized = data
      ? {
          ...data,
          title: data.title || data.name || '',
          filename: data.filename || '',
        }
      : {};
    setForm(normalized);
    setErr('');
    setModal({ type, data });
  };

  const closeModal = () => { setModal(null); setForm({}); setErr(''); };

  const saveGame = async () => {
    setLoading(true); setErr('');

    const payload = {
      title: String(form.title || form.name || '').trim(),
      filename: String(form.filename || '').trim(),
      url: String(form.url || '').trim(),
      thumbnail: String(form.thumbnail || '').trim(),
      description: String(form.description || '').trim(),
      category: String(form.category || '').trim(),
      featured: !!form.featured,
      trending: !!form.trending,
    };

    if (!payload.title) {
      setErr('Title is required.');
      setLoading(false);
      return;
    }

    if (!payload.filename && !payload.url) {
      setErr('Provide either a local filename or a URL.');
      setLoading(false);
      return;
    }

    try {
      if (modal.data?.id) await API.put(`/games/${modal.data.id}`, payload);
      else await API.post('/games', payload);
      await loadData(); closeModal();
    } catch (e) { setErr(e.response?.data?.error || 'Error saving game'); }
    setLoading(false);
  };

  const deleteGame = async (id) => {
    if (!window.confirm('Delete this game?')) return;
    try {
      await API.delete(`/games/${id}`);
      loadData();
    } catch (e) {
      setErr(e.response?.data?.error || 'Error deleting game');
    }
  };

  const saveBM = async () => {
    setLoading(true); setErr('');
    try {
      await API.post('/admin/bookmarklets', form);
      await loadData(); closeModal();
    } catch (e) { setErr(e.response?.data?.error || 'Error'); }
    setLoading(false);
  };

  const deleteBM = async (id) => {
    await API.delete(`/admin/bookmarklets/${id}`);
    loadData();
  };

  const saveBypass = async () => {
    setLoading(true); setErr('');
    try {
      await API.post('/admin/bypasses', form);
      await loadData(); closeModal();
    } catch (e) { setErr(e.response?.data?.error || 'Error'); }
    setLoading(false);
  };

  const deleteBypass = async (id) => {
    await API.delete(`/admin/bypasses/${id}`);
    loadData();
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="shield" size={28} style={{ color: 'var(--accent)' }} />
          Admin Panel
        </h1>
        <p className="page-subtitle">Manage games, bookmarklets, bypasses, and monitor activity</p>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t} className={`admin-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'Overview' && stats && (
        <div className="animate-up">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
            {[
              { label: 'Total Users', value: stats.users, icon: 'user' },
              { label: 'Total Games', value: stats.games, icon: 'gamepad' },
              { label: 'Chat Messages', value: stats.messages, icon: 'chat' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon} size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
                <div className="stat-value">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="settings-section-title" style={{ marginBottom: 14 }}>Top Games by Plays</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(stats.topGames || []).map((g, i) => (
              <div key={g.title || g.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontWeight: 800, fontSize: 13, color: 'var(--accent)', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <span style={{ flex: 1, fontWeight: 600 }}>{g.title || g.name}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(g.play_count || 0).toLocaleString()} plays</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Games */}
      {tab === 'Games' && (
        <div className="animate-up">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => openModal('game')}>
              <Icon name="plus" size={16} /> Add Game
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Title</th><th>Category</th><th>Plays</th><th>Featured</th><th>Trending</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {games.map(g => (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: 200 }} className="truncate">{g.title || g.name}</td>
                    <td><span className="game-category">{g.category || 'Uncategorized'}</span></td>
                    <td>{(g.play_count || 0).toLocaleString()}</td>
                    <td><span style={{ color: g.featured ? '#4cff8a' : 'var(--text-muted)' }}>{g.featured ? 'Yes' : 'No'}</span></td>
                    <td><span style={{ color: g.trending ? '#ffa032' : 'var(--text-muted)' }}>{g.trending ? 'Yes' : 'No'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openModal('game', g)}><Icon name="edit" size={14} /></button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteGame(g.id)}><Icon name="trash" size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bookmarklets */}
      {tab === 'Bookmarklets' && (
        <div className="animate-up">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => openModal('bm')}>
              <Icon name="plus" size={16} /> Add Bookmarklet
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {bookmarklets.map(bm => (
              <div key={bm.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>{bm.title}</div>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteBM(bm.id)}><Icon name="trash" size={13} /></button>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>{bm.description}</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 6, wordBreak: 'break-all', maxHeight: 60, overflow: 'hidden' }}>
                  {bm.code}
                </div>
                <div style={{ marginTop: 8 }}>
                  <a href={bm.code} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                    <Icon name="bookmark" size={13} /> Install
                  </a>
                </div>
              </div>
            ))}
            {bookmarklets.length === 0 && <div className="text-muted text-sm">No bookmarklets yet.</div>}
          </div>
        </div>
      )}

      {/* Bypasses */}
      {tab === 'Bypasses' && (
        <div className="animate-up">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => openModal('bypass')}>
              <Icon name="plus" size={16} /> Add Bypass
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {bypasses.map(bp => (
              <div key={bp.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>{bp.title}</div>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteBypass(bp.id)}><Icon name="trash" size={13} /></button>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>{bp.description}</div>
                {bp.method && <div style={{ display: 'inline-block', background: 'var(--accent-glow)', color: 'var(--accent)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>{bp.method}</div>}
                {bp.url && <div><a href={bp.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}><Icon name="external" size={13} /> Visit</a></div>}
              </div>
            ))}
            {bypasses.length === 0 && <div className="text-muted text-sm">No bypasses yet.</div>}
          </div>
        </div>
      )}

      {/* Modals */}
      {modal?.type === 'game' && (
        <Modal title={modal.data?.id ? 'Edit Game' : 'Add Game'} onClose={closeModal}>
          {err && <div className="auth-error">{err}</div>}
          {[
            { key: 'title', label: 'Title *', placeholder: 'Game title' },
            { key: 'filename', label: 'Local Filename', placeholder: 'my-game.html' },
            { key: 'url', label: 'External URL', placeholder: 'https://game-url.com' },
            { key: 'thumbnail', label: 'Thumbnail URL', placeholder: 'https://image-url.com/thumb.jpg' },
            { key: 'description', label: 'Description', placeholder: 'Short description' },
          ].map(f => (
            <div key={f.key} className="input-group">
              <label className="input-label">{f.label}</label>
              <input className="input" placeholder={f.placeholder} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div className="input-group">
            <label className="input-label">Category *</label>
            <select className="select w-full" value={form.category || ''} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              <option value="">Select category</option>
              {['Action', 'Adventure', 'Horror', '2 Player'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {['featured', 'trending'].map(key => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} />
                <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{key}</span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={saveGame} disabled={loading}>
              {loading ? 'Saving...' : 'Save Game'}
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === 'bm' && (
        <Modal title="Add Bookmarklet" onClose={closeModal}>
          {err && <div className="auth-error">{err}</div>}
          {[
            { key: 'title', label: 'Title *', placeholder: 'Bookmarklet name' },
            { key: 'description', label: 'Description', placeholder: 'What does it do?' },
            { key: 'code', label: 'Code (javascript: ...) *', placeholder: 'javascript:void(0)' },
            { key: 'category', label: 'Category', placeholder: 'general' },
          ].map(f => (
            <div key={f.key} className="input-group">
              <label className="input-label">{f.label}</label>
              <input className="input" placeholder={f.placeholder} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={saveBM} disabled={loading}>Save</button>
          </div>
        </Modal>
      )}

      {modal?.type === 'bypass' && (
        <Modal title="Add Bypass" onClose={closeModal}>
          {err && <div className="auth-error">{err}</div>}
          {[
            { key: 'title', label: 'Title *', placeholder: 'Bypass name' },
            { key: 'description', label: 'Description', placeholder: 'How it works' },
            { key: 'url', label: 'URL', placeholder: 'https://bypass-link.com' },
            { key: 'method', label: 'Method', placeholder: 'e.g. DNS, VPN, Proxy' },
            { key: 'category', label: 'Category', placeholder: 'general' },
          ].map(f => (
            <div key={f.key} className="input-group">
              <label className="input-label">{f.label}</label>
              <input className="input" placeholder={f.placeholder} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={saveBypass} disabled={loading}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}


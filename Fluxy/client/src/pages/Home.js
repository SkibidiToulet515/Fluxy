import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Icon from '../components/Icon';

function nameColor(name) {
  const colors = ['#6e56ff','#ff56b8','#50a0dc','#ff64a0','#50c8a0','#ffb41e','#be78ff','#ff3c1e','#82a0ff','#00ffb4'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function MiniGameCard({ game, onClick }) {
  const color = nameColor(game.name);
  return (
    <div className="game-card" onClick={() => onClick(game)} style={{ cursor: 'pointer' }}>
      <div style={{
        width: '100%', aspectRatio: '16/10',
        background: `linear-gradient(135deg, ${color}22, ${color}44)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 0, transparent 50%)`,
          backgroundSize: '12px 12px',
        }} />
        <span style={{ fontFamily: 'Syne', fontSize: 38, fontWeight: 800, color, opacity: 0.85, position: 'relative', textShadow: `0 0 30px ${color}60` }}>
          {game.name[0].toUpperCase()}
        </span>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      </div>
      <div className="game-info">
        <div className="game-title">{game.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'monospace' }}>{game.filename}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const { API, addRecentGame, getRecentGames } = useApp();
  const navigate = useNavigate();
  const [allGames, setAllGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/games/all').then(({ data }) => {
      setAllGames(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [API]);

  const recent = useMemo(() => getRecentGames().slice(0, 8), [getRecentGames]);

  // Pick "featured" = first 8 games for demo (or could be randomised)
  const featured = useMemo(() => {
    if (allGames.length === 0) return [];
    // Take a spread: every ~343rd game to get variety
    const step = Math.floor(allGames.length / 8);
    return Array.from({ length: 8 }, (_, i) => allGames[i * step]);
  }, [allGames]);

  // "Trending" = last 8 added (end of list)
  const trending = useMemo(() => allGames.slice(-8).reverse(), [allGames]);

  const openGame = useCallback(async (game) => {
    addRecentGame(game);
    try { await API.post(`/games/${game.id}/play`); } catch {}
    window.open(game.playUrl, '_blank', 'noopener');
  }, [API, addRecentGame]);

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading...</span></div>;

  return (
    <div className="page animate-fade">
      {/* Hero */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 28px var(--accent-glow)',
          }}>
            <Icon name="fluxy" size={28} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
              Welcome to <span style={{ color: 'var(--accent)' }}>Fluxy</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
              {allGames.length.toLocaleString()} games — no downloads, play instantly
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Browse All Games', icon: 'gamepad', to: '/games', primary: true },
            { label: 'Open Proxy', icon: 'globe', to: '/proxy' },
            { label: 'Live Chat', icon: 'chat', to: '/chat' },
          ].map(a => (
            <button key={a.to} className={`btn ${a.primary ? 'btn-primary' : 'btn-ghost'}`} onClick={() => navigate(a.to)}>
              <Icon name={a.icon} size={16} />{a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 40 }}>
        {[
          { label: 'Total Games', value: allGames.length.toLocaleString(), icon: 'gamepad' },
          { label: 'Play Instantly', value: '0ms', icon: 'play' },
          { label: 'Proxy Engines', value: '2', icon: 'globe' },
          { label: 'Themes', value: '10', icon: 'star' },
        ].map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={s.icon} size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recently Played */}
      {recent.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div className="section-header">
            <h2 className="section-title"><Icon name="clock" size={17} style={{ color: 'var(--accent)' }} /> Play Again</h2>
            <button className="section-link" onClick={() => navigate('/games')}>All Games →</button>
          </div>
          <div className="games-grid">
            {recent.map(g => <MiniGameCard key={g.id} game={g} onClick={openGame} />)}
          </div>
        </section>
      )}

      {/* Featured */}
      <section style={{ marginBottom: 40 }}>
        <div className="section-header">
          <h2 className="section-title"><span className="section-dot" />Featured Games</h2>
          <button className="section-link" onClick={() => navigate('/games')}>See All {allGames.length.toLocaleString()} →</button>
        </div>
        <div className="featured-grid">
          {featured.map(g => g && <MiniGameCard key={g.id} game={g} onClick={openGame} />)}
        </div>
      </section>

      {/* Trending (last added) */}
      <section style={{ marginBottom: 40 }}>
        <div className="section-header">
          <h2 className="section-title"><Icon name="fire" size={18} style={{ color: '#ffa032' }} /> Recently Added</h2>
          <button className="section-link" onClick={() => navigate('/games')}>Browse Library →</button>
        </div>
        <div className="games-grid">
          {trending.map(g => <MiniGameCard key={g.id} game={g} onClick={openGame} />)}
        </div>
      </section>
    </div>
  );
}

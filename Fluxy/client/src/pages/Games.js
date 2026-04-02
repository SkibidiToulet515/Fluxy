import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import Icon from '../components/Icon';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitial(name) {
  return (name || '?')[0].toUpperCase();
}

// Assign a stable color per game based on name hash
function nameColor(name) {
  const colors = [
    '#6e56ff','#ff56b8','#50a0dc','#ff64a0','#50c8a0',
    '#ffb41e','#be78ff','#ff3c1e','#82a0ff','#00ffb4',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

// ── Game Tile ─────────────────────────────────────────────────────────────────

function GameTile({ game, onPlay, isRecent }) {
  const color = nameColor(game.name);
  const initial = getInitial(game.name);

  return (
    <div
      className="game-card animate-up"
      onClick={() => onPlay(game)}
      style={{ cursor: 'pointer' }}
      title={game.name}
    >
      {/* Thumbnail — colored initial since we have no cover images */}
      <div style={{
        width: '100%', aspectRatio: '16/10',
        background: `linear-gradient(135deg, ${color}22, ${color}44)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Decorative background pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.07,
          backgroundImage: `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 0, transparent 50%)`,
          backgroundSize: '12px 12px',
        }} />
        <span style={{
          fontFamily: 'Syne', fontSize: 42, fontWeight: 800,
          color, opacity: 0.85, userSelect: 'none', position: 'relative',
          textShadow: `0 0 30px ${color}60`,
        }}>
          {initial}
        </span>
        {isRecent && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            border: `1px solid ${color}60`, borderRadius: 6,
            padding: '2px 8px', fontSize: 10, fontWeight: 700, color,
          }}>
            RECENT
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${color}, transparent)`,
        }} />
      </div>

      {/* Info */}
      <div className="game-info">
        <div className="game-title" style={{ color: 'var(--text-primary)' }}>{game.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: color,
            boxShadow: `0 0 6px ${color}`,
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {game.filename}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Games Page ───────────────────────────────────────────────────────────

const PAGE_SIZE = 60;
const ALPHABET = ['#', 'A','B','C','D','E','F','G','H','I','J','K','L','M',
                  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

export default function Games() {
  const { API, addRecentGame, getRecentGames } = useApp();

  const [allGames, setAllGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [letterFilter, setLetterFilter] = useState('');
  const [page, setPage] = useState(1);
  const [recentIds, setRecentIds] = useState(new Set());
  const [activeGame, setActiveGame] = useState(null);
  const searchRef = useRef(null);
  const gridRef = useRef(null);

  // Load all 2750 games once
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await API.get('/games/all');
        setAllGames(data);
      } catch (e) {
        console.error('Failed to load games', e);
      }
      setLoading(false);
    };
    load();
    const recent = getRecentGames();
    setRecentIds(new Set(recent.map(g => g.id)));
  }, [API, getRecentGames]);

  // Filter games
  const filtered = useMemo(() => {
    let result = allGames;
    if (letterFilter) {
      if (letterFilter === '#') {
        result = result.filter(g => !/^[a-zA-Z]/.test(g.name));
      } else {
        result = result.filter(g => g.name.toUpperCase().startsWith(letterFilter));
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(g => g.name.toLowerCase().includes(q));
    }
    return result;
  }, [allGames, search, letterFilter]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [search, letterFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const openGame = useCallback(async (game) => {
    // Record locally
    addRecentGame(game);
    setRecentIds(prev => new Set([...prev, game.id]));
    // Increment server play count
    try { await API.post(`/games/${game.id}/play`); } catch {}
    // Open in new tab — games are full HTML files
    window.open(game.playUrl, '_blank', 'noopener');
  }, [API, addRecentGame]);

  const recentGames = useMemo(() =>
    getRecentGames().slice(0, 12),
  [getRecentGames, recentIds]); // eslint-disable-line

  const scrollTop = () => gridRef.current?.scrollIntoView({ behavior: 'smooth' });

  const goPage = (p) => {
    setPage(p);
    scrollTop();
  };

  if (loading) return (
    <div className="loading"><div className="spinner" /><span>Loading 2,750 games...</span></div>
  );

  return (
    <div className="page animate-fade">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Games</h1>
        <p className="page-subtitle">
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{allGames.length.toLocaleString()}</span> games — click any to play in a new tab
        </p>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="input-search" style={{ flex: 1, minWidth: 200, maxWidth: 500 }}>
          <Icon name="search" size={16} className="input-search-icon" />
          <input
            ref={searchRef}
            className="input"
            placeholder={`Search ${allGames.length} games...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        {(search || letterFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setLetterFilter(''); }}>
            <Icon name="close" size={13} /> Clear
          </button>
        )}
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
          {filtered.length.toLocaleString()} results
        </div>
      </div>

      {/* A–Z filter bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 24,
        padding: '12px 14px', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 12,
      }}>
        <button
          onClick={() => setLetterFilter('')}
          style={{
            padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 12, fontFamily: 'Syne',
            background: !letterFilter ? 'var(--accent)' : 'transparent',
            color: !letterFilter ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
        >
          ALL
        </button>
        {ALPHABET.map(letter => (
          <button
            key={letter}
            onClick={() => setLetterFilter(letter === letterFilter ? '' : letter)}
            style={{
              width: 30, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 12, fontFamily: 'Syne',
              background: letterFilter === letter ? 'var(--accent)' : 'transparent',
              color: letterFilter === letter ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.12s',
            }}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Recently Played */}
      {!search && !letterFilter && recentGames.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div className="section-header">
            <h2 className="section-title">
              <Icon name="clock" size={17} style={{ color: 'var(--accent)' }} />
              Recently Played
            </h2>
          </div>
          <div className="games-grid">
            {recentGames.map(g => (
              <GameTile key={`rec-${g.id}`} game={g} onPlay={openGame} isRecent={false} />
            ))}
          </div>
        </section>
      )}

      {/* Games grid */}
      <div ref={gridRef}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <h2 className="section-title">
            <span className="section-dot" />
            {letterFilter ? `"${letterFilter}" Games` : search ? `Results for "${search}"` : 'All Games'}
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
              ({filtered.length.toLocaleString()})
            </span>
          </h2>
          {totalPages > 1 && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ marginBottom: 12, opacity: 0.3 }}><Icon name="gamepad" size={48} /></div>
            <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No games found</div>
            <div className="text-muted">Try a different search term or letter</div>
          </div>
        ) : (
          <div className="games-grid">
            {paginated.map(game => (
              <GameTile
                key={game.id}
                game={game}
                onPlay={openGame}
                isRecent={recentIds.has(game.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, marginTop: 32, flexWrap: 'wrap',
        }}>
          <button className="btn btn-ghost btn-sm" onClick={() => goPage(1)} disabled={page === 1}>
            «
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => goPage(page - 1)} disabled={page === 1}>
            ‹ Prev
          </button>

          {/* Page number pills */}
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let p;
            if (totalPages <= 7) p = i + 1;
            else if (page <= 4) p = i + 1;
            else if (page >= totalPages - 3) p = totalPages - 6 + i;
            else p = page - 3 + i;
            return (
              <button
                key={p}
                onClick={() => goPage(p)}
                style={{
                  minWidth: 36, height: 34, padding: '0 10px', borderRadius: 9,
                  border: '1px solid', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  transition: 'all 0.15s',
                  background: page === p ? 'var(--accent)' : 'var(--bg-card)',
                  borderColor: page === p ? 'var(--accent)' : 'var(--border)',
                  color: page === p ? '#fff' : 'var(--text-secondary)',
                  boxShadow: page === p ? '0 0 12px var(--accent-glow)' : 'none',
                }}
              >
                {p}
              </button>
            );
          })}

          <button className="btn btn-ghost btn-sm" onClick={() => goPage(page + 1)} disabled={page === totalPages}>
            Next ›
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => goPage(totalPages)} disabled={page === totalPages}>
            »
          </button>
        </div>
      )}

      {/* How to play notice */}
      <div style={{
        marginTop: 32, padding: '14px 18px', borderRadius: 12,
        background: 'var(--accent-glow)', border: '1px solid var(--border-accent)',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <Icon name="star" size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>How to play</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Click any game to open it in a new tab. Make sure your game files are in the folder configured as{' '}
            <code style={{ fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 4 }}>
              GAMES_DIR
            </code>{' '}
            on the server (see README). The server looks for each file by its original filename.
          </div>
        </div>
      </div>
    </div>
  );
}

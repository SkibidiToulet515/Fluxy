import React, { useState, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import Icon from '../components/Icon';

// Search engine options
const SEARCH_ENGINES = {
  duckduckgo: {
    label: 'DuckDuckGo',
    searchUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}&ia=web`,
    homeUrl: 'https://duckduckgo.com',
    color: '#de5833',
    desc: 'Private & secure search',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="48" fill="#de5833"/>
        <circle cx="50" cy="42" r="22" fill="white"/>
        <circle cx="43" cy="38" r="5" fill="#1a1a1a"/>
        <circle cx="57" cy="38" r="5" fill="#1a1a1a"/>
        <circle cx="44" cy="37" r="2" fill="white"/>
        <circle cx="58" cy="37" r="2" fill="white"/>
        <path d="M38 52 Q50 62 62 52" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <ellipse cx="50" cy="72" rx="14" ry="8" fill="white" opacity="0.9"/>
        <path d="M36 72 Q50 80 64 72" stroke="#de5833" strokeWidth="2" fill="none"/>
      </svg>
    ),
  },
  brave: {
    label: 'Brave Search',
    searchUrl: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
    homeUrl: 'https://search.brave.com',
    color: '#fb542b',
    desc: 'Independent & unbiased',
    icon: (
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
        <path d="M50 5 L88 20 L85 60 Q80 80 50 95 Q20 80 15 60 L12 20 Z" fill="#fb542b"/>
        <path d="M50 18 L76 30 L74 60 Q70 75 50 85 Q30 75 26 60 L24 30 Z" fill="white" opacity="0.15"/>
        <path d="M38 42 L44 55 L50 42 L56 55 L62 42" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M34 42 Q32 50 35 56 L38 42Z" fill="white" opacity="0.7"/>
        <path d="M66 42 Q68 50 65 56 L62 42Z" fill="white" opacity="0.7"/>
      </svg>
    ),
  },
};

function normalizeUrl(raw, searchEngine = 'duckduckgo') {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  // Looks like a URL
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Has a dot and no spaces — treat as domain
  if (trimmed.includes('.') && !trimmed.includes(' ') && !trimmed.startsWith('http')) {
    return 'https://' + trimmed;
  }
  // Everything else = search query
  return SEARCH_ENGINES[searchEngine].searchUrl(trimmed);
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Proxy() {
  const { proxyEngine, setProxyEngine, addProxyHistory, getProxyHistory } = useApp();
  const [urlInput, setUrlInput] = useState('');
  const [activeUrl, setActiveUrl] = useState(null);
  const [history, setHistory] = useState(() => getProxyHistory());
  const [searchEngine, setSearchEngine] = useState(
    () => localStorage.getItem('fluxy_search_engine') || 'duckduckgo'
  );

  const changeSearchEngine = (id) => {
    setSearchEngine(id);
    localStorage.setItem('fluxy_search_engine', id);
  };

  const go = useCallback((raw) => {
    const url = normalizeUrl(raw, searchEngine);
    if (!url) return;
    setActiveUrl(url);
    addProxyHistory(url);
    setHistory(getProxyHistory());
  }, [searchEngine, addProxyHistory, getProxyHistory]);

  const handleKey = (e) => { if (e.key === 'Enter') go(urlInput); };

  const clearHistory = () => {
    localStorage.removeItem('fluxy_proxy_history');
    setHistory([]);
  };

  const engine = SEARCH_ENGINES[searchEngine];

  // ── Active iframe view ────────────────────────────────────────────────────
  if (activeUrl) {
    return (
      <div className="proxy-frame-wrap animate-fade">
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {/* Nav buttons */}
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setActiveUrl(null)} title="Home">
            <Icon name="chevronLeft" size={16} />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" title="Refresh" onClick={() => {
            const u = activeUrl; setActiveUrl(null); setTimeout(() => setActiveUrl(u), 60);
          }}>
            <Icon name="refresh" size={14} />
          </button>

          {/* Search engine badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 8,
            background: `${engine.color}18`,
            border: `1px solid ${engine.color}40`,
            flexShrink: 0,
          }}>
            {engine.icon}
            <span style={{ fontSize: 12, fontWeight: 700, color: engine.color }}>{engine.label}</span>
          </div>

          {/* URL bar */}
          <div className="proxy-bar" style={{ flex: 1 }}>
            <Icon name="globe" size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              className="proxy-input"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') go(urlInput); }}
              placeholder={`Search ${engine.label} or enter URL...`}
              style={{ flex: 1, fontSize: 13 }}
            />
          </div>

          {/* Proxy engine */}
          <select
            className="proxy-engine-select"
            value={proxyEngine}
            onChange={e => setProxyEngine(e.target.value)}
            style={{ flexShrink: 0 }}
          >
            <option value="uv">Ultraviolet</option>
            <option value="scramjet">Scramjet</option>
          </select>

          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => window.open(activeUrl, '_blank')} title="Open in new tab">
            <Icon name="external" size={14} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveUrl(null)}>
            <Icon name="close" size={14} /> Exit
          </button>
        </div>

        {/* Status bar */}
        <div style={{
          padding: '5px 14px', background: 'rgba(0,0,0,0.2)',
          borderBottom: '1px solid var(--border)', fontSize: 11,
          color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="shield" size={11} style={{ color: 'var(--accent)' }} />
            <span>Engine: <strong style={{ color: 'var(--accent)' }}>{proxyEngine === 'uv' ? 'Ultraviolet' : 'Scramjet'}</strong></span>
          </div>
          <span style={{ opacity: 0.4 }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {engine.icon}
            <span>Search: <strong style={{ color: engine.color }}>{engine.label}</strong></span>
          </div>
          <span style={{ marginLeft: 'auto', fontFamily: 'monospace', opacity: 0.5 }} className="truncate">
            {activeUrl.slice(0, 60)}{activeUrl.length > 60 ? '...' : ''}
          </span>
        </div>

        <iframe
          src={activeUrl}
          title="Proxy Browser"
          style={{ flex: 1, border: 'none', width: '100%' }}
          allow="fullscreen; clipboard-write; autoplay"
          sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"
        />
      </div>
    );
  }

  // ── Home / landing view ───────────────────────────────────────────────────
  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h1 className="page-title">Proxy Browser</h1>
        <p className="page-subtitle">Private browsing powered by Ultraviolet & Scramjet</p>
      </div>

      {/* Search Engine Selector */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-muted)', marginBottom: 10 }}>
          Search Engine
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {Object.entries(SEARCH_ENGINES).map(([id, eng]) => (
            <button
              key={id}
              onClick={() => changeSearchEngine(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 20px', borderRadius: 14, cursor: 'pointer',
                background: searchEngine === id ? `${eng.color}15` : 'var(--bg-card)',
                border: `2px solid ${searchEngine === id ? eng.color : 'var(--border)'}`,
                transition: 'all 0.18s', minWidth: 200,
                boxShadow: searchEngine === id ? `0 0 20px ${eng.color}25` : 'none',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: searchEngine === id ? `${eng.color}20` : 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${searchEngine === id ? eng.color + '40' : 'var(--border)'}`,
              }}>
                {eng.icon}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontFamily: 'Syne', fontWeight: 700, fontSize: 15,
                  color: searchEngine === id ? eng.color : 'var(--text-primary)',
                }}>
                  {eng.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{eng.desc}</div>
              </div>
              {searchEngine === id && (
                <div style={{
                  marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%',
                  background: eng.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <polyline points="1,5.5 4,8.5 10,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Proxy Engine selector */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-muted)', marginBottom: 10 }}>
          Proxy Engine
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { id: 'uv', label: 'Ultraviolet', desc: 'Standard proxy engine' },
            { id: 'scramjet', label: 'Scramjet', desc: 'Advanced bypass engine' },
          ].map(e => (
            <button
              key={e.id}
              onClick={() => setProxyEngine(e.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                padding: '12px 18px', borderRadius: 12, cursor: 'pointer',
                background: proxyEngine === e.id ? 'var(--accent-glow)' : 'var(--bg-card)',
                border: `1px solid ${proxyEngine === e.id ? 'var(--border-accent)' : 'var(--border)'}`,
                transition: 'all 0.15s', minWidth: 150,
              }}
            >
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: proxyEngine === e.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                {e.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{e.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main search/URL bar */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: `1px solid var(--border)`,
        borderRadius: 16, padding: '6px 8px',
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 32,
        boxShadow: `0 0 0 1px transparent`,
        transition: 'box-shadow 0.2s',
      }}
        onFocusCapture={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${engine.color}40`}
        onBlurCapture={e => e.currentTarget.style.boxShadow = '0 0 0 1px transparent'}
      >
        {/* Engine icon in bar */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${engine.color}18`, border: `1px solid ${engine.color}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {engine.icon}
        </div>

        <input
          className="proxy-input"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Search with ${engine.label} or enter a URL...`}
          style={{ flex: 1, fontSize: 15, padding: '8px 0' }}
          autoFocus
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => go(urlInput)}
          style={{ flexShrink: 0, background: engine.color, boxShadow: `0 4px 16px ${engine.color}40` }}
        >
          <Icon name="play" size={14} />
          Go
        </button>
      </div>

      {/* Quick access */}
      <div style={{ marginBottom: 36 }}>
        <div className="section-header">
          <h2 className="section-title"><span className="section-dot" />Quick Access</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {[
            { label: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: 'search' },
            { label: 'Brave Search', url: 'https://search.brave.com', icon: 'shield' },
            { label: 'YouTube', url: 'https://youtube.com', icon: 'play' },
            { label: 'Wikipedia', url: 'https://wikipedia.org', icon: 'globe' },
            { label: 'Reddit', url: 'https://reddit.com', icon: 'chat' },
            { label: 'GitHub', url: 'https://github.com', icon: 'star' },
          ].map(site => (
            <button
              key={site.url}
              className="btn btn-ghost"
              style={{ justifyContent: 'flex-start', gap: 10, padding: '12px 14px' }}
              onClick={() => { setUrlInput(site.url); go(site.url); }}
            >
              <Icon name={site.icon} size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{site.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <div className="section-header">
            <h2 className="section-title">
              <Icon name="clock" size={17} style={{ color: 'var(--accent)' }} />
              Recent Sites
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={clearHistory}>
              <Icon name="trash" size={13} /> Clear
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.slice(0, 10).map((item, i) => (
              <div key={i} className="proxy-history-item" onClick={() => { setUrlInput(item.url); go(item.url); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Icon name="globe" size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span className="proxy-url truncate">{item.url}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 12 }}>
                  {timeAgo(item.visitedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

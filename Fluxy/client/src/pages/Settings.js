import React from 'react';
import { useApp } from '../contexts/AppContext';
import Icon from '../components/Icon';

const THEMES = [
  { id: 'glassy', label: 'Glassy', colors: ['#6e56ff', '#0a0a14', '#ff56b8'] },
  { id: 'moonlight', label: 'Moonlight', colors: ['#82a0ff', '#0d0e1a', '#a0c4ff'] },
  { id: 'haze', label: 'Haze', colors: ['#be78ff', '#0e0814', '#ff78d4'] },
  { id: 'steel', label: 'Steel', colors: ['#50a0dc', '#0c0e10', '#50dccc'] },
  { id: 'blossom', label: 'Blossom', colors: ['#ff64a0', '#12080e', '#ffa064'] },
  { id: 'obsidian', label: 'Obsidian', colors: ['#c8a050', '#050505', '#e8c870'] },
  { id: 'neongrid', label: 'NeonGrid', colors: ['#00ffb4', '#020810', '#00b4ff'] },
  { id: 'aurora', label: 'Aurora', colors: ['#50c8a0', '#060c10', '#50a0e8'] },
  { id: 'carbon', label: 'Carbon', colors: ['#ff3c1e', '#080808', '#ff8c1e'] },
  { id: 'solar', label: 'Solar', colors: ['#ffb41e', '#0e0800', '#ff6e1e'] },
];

function ThemePreview({ colors }) {
  return (
    <div className="theme-preview">
      <div style={{ width: '100%', height: '100%', background: colors[1], position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 4, left: 4, right: 4, height: 6, borderRadius: 3, background: colors[0], opacity: 0.8 }} />
        <div style={{ position: 'absolute', top: 14, left: 4, right: 12, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ position: 'absolute', top: 22, left: 4, width: 20, height: 4, borderRadius: 2, background: colors[2], opacity: 0.7 }} />
        <div style={{ position: 'absolute', top: 22, left: 28, right: 4, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }} />
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

export default function Settings() {
  const { theme, setTheme, layout, setLayout, proxyEngine, setProxyEngine } = useApp();

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Customize your Fluxy experience</p>
      </div>

      {/* Theme */}
      <div className="settings-section">
        <div className="settings-section-title">Theme</div>
        <div className="theme-grid">
          {THEMES.map(t => (
            <div
              key={t.id}
              className={`theme-card${theme === t.id ? ' active' : ''}`}
              onClick={() => setTheme(t.id)}
            >
              <ThemePreview colors={t.colors} />
              <span className="theme-name">{t.label}</span>
              {theme === t.id && (
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                    <polyline points="1,5 4,8 9,2" strokeWidth="1.5" stroke="white" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div className="settings-section">
        <div className="settings-section-title">Layout</div>
        <div className="toggle-row">
          <div>
            <div className="toggle-label">Sidebar Navigation</div>
            <div className="toggle-desc">Show the side navigation panel</div>
          </div>
          <Toggle checked={layout === 'sidebar'} onChange={v => setLayout(v ? 'sidebar' : 'taskbar')} />
        </div>
        <div className="toggle-row">
          <div>
            <div className="toggle-label">Bottom Taskbar</div>
            <div className="toggle-desc">Use bottom navigation bar instead</div>
          </div>
          <Toggle checked={layout === 'taskbar'} onChange={v => setLayout(v ? 'taskbar' : 'sidebar')} />
        </div>
      </div>

      {/* Proxy */}
      <div className="settings-section">
        <div className="settings-section-title">Proxy Engine</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { id: 'uv', label: 'Ultraviolet', desc: 'Standard & compatible' },
            { id: 'scramjet', label: 'Scramjet', desc: 'Advanced bypass mode' },
          ].map(e => (
            <button
              key={e.id}
              onClick={() => setProxyEngine(e.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                padding: '16px 18px', borderRadius: 12, cursor: 'pointer',
                background: proxyEngine === e.id ? 'var(--accent-glow)' : 'var(--bg-card)',
                border: `2px solid ${proxyEngine === e.id ? 'var(--accent)' : 'var(--border)'}`,
                transition: 'all 0.18s',
              }}
            >
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: proxyEngine === e.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                {e.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{e.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="settings-section">
        <div className="settings-section-title">About</div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px var(--accent-glow)', flexShrink: 0
          }}>
            <Icon name="fluxy" size={30} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18 }}>Fluxy</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Version 1.0.0 — Gaming & Tools Platform</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              React + Node.js + Socket.io
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Icon from './Icon';

const navItems = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/games', label: 'Games', icon: 'gamepad' },
  { to: '/chat', label: 'Chat', icon: 'chat' },
  { to: '/proxy', label: 'Proxy', icon: 'globe' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout, sidebarCollapsed, setSidebarCollapsed } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <aside className={`sidebar${sidebarCollapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      {/* Logo */}
      <NavLink to="/" className="sidebar-logo" onClick={onClose}>
        <div className="sidebar-logo-mark">
          <Icon name="fluxy" size={22} style={{ color: '#fff' }} />
        </div>
        <span className="sidebar-logo-text">Fluxy</span>
      </NavLink>

      {/* Nav */}
      <nav className="sidebar-nav">
        <span className="sidebar-section-title">Navigate</span>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={onClose}
          >
            <Icon name={item.icon} size={20} className="nav-icon" />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <span className="sidebar-section-title" style={{ marginTop: 8 }}>Admin</span>
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <Icon name="shield" size={20} className="nav-icon" />
              <span className="nav-label">Admin Panel</span>
            </NavLink>
          </>
        )}

        <span className="sidebar-section-title" style={{ marginTop: 8 }}>System</span>
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onClick={onClose}
        >
          <Icon name="settings" size={20} className="nav-icon" />
          <span className="nav-label">Settings</span>
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="nav-item w-full mb-2"
          style={{ justifyContent: 'flex-start' }}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          <Icon name={sidebarCollapsed ? 'chevronRight' : 'chevronLeft'} size={20} className="nav-icon" />
          <span className="nav-label">Collapse</span>
        </button>

        {user ? (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user.username[0].toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name truncate">{user.username}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 6 }} title="Logout">
              <Icon name="logout" size={16} />
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="nav-item" onClick={onClose}>
            <Icon name="user" size={20} className="nav-icon" />
            <span className="nav-label">Sign In</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
}

import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import Icon from "./Icon";

const navItems = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/games", label: "Games", icon: "gamepad" },
  { to: "/chat", label: "Chat", icon: "chat" },
  { to: "/proxy", label: "Proxy", icon: "globe" },
];

const SIDE_STATS = [
  { key: "games", label: "Total Games" },
  { key: "latency", label: "Play Instantly" },
  { key: "proxy", label: "Proxy Engines" },
  { key: "themes", label: "Themes" },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout, sidebarCollapsed, setSidebarCollapsed, API } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    games: "2750",
    latency: "0ms",
    proxy: "2",
    themes: "10",
  });

  useEffect(() => {
    let mounted = true;
    API.get("/games?limit=1")
      .then(({ data }) => {
        if (!mounted) return;
        const total = Number(data?.total) || 0;
        setStats((prev) => ({ ...prev, games: total.toLocaleString() }));
      })
      .catch(() => {
        // keep defaults
      });

    return () => {
      mounted = false;
    };
  }, [API]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className={`sidebar${sidebarCollapsed ? " sidebar-collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
      <NavLink to="/" className="sidebar-logo" onClick={onClose}>
        <div className="sidebar-logo-mark">
          <img src="/fluxy-logo.svg" alt="Fluxy logo" className="sidebar-logo-img" />
        </div>
        <span className="sidebar-logo-text">Fluxy</span>
      </NavLink>

      <nav className="sidebar-nav">
        <span className="sidebar-section-title">Navigate</span>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={onClose}
          >
            <Icon name={item.icon} size={20} className="nav-icon" />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        {user?.role === "admin" && (
          <>
            <span className="sidebar-section-title" style={{ marginTop: 8 }}>
              Admin
            </span>
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              onClick={onClose}
            >
              <Icon name="shield" size={20} className="nav-icon" />
              <span className="nav-label">Admin Panel</span>
            </NavLink>
          </>
        )}

        <span className="sidebar-section-title" style={{ marginTop: 8 }}>
          System
        </span>
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          onClick={onClose}
        >
          <Icon name="settings" size={20} className="nav-icon" />
          <span className="nav-label">Settings</span>
        </NavLink>
      </nav>

      {!sidebarCollapsed && (
        <div className="sidebar-stats">
          {SIDE_STATS.map((entry) => (
            <div key={entry.key} className="sidebar-stat-row">
              <span className="sidebar-stat-label">{entry.label}</span>
              <span className="sidebar-stat-value">{stats[entry.key]}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-footer">
        <button
          className="nav-item w-full mb-2"
          style={{ justifyContent: "flex-start" }}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expand" : "Collapse"}
        >
          <Icon name={sidebarCollapsed ? "chevronRight" : "chevronLeft"} size={20} className="nav-icon" />
          <span className="nav-label">Collapse</span>
        </button>

        {user ? (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user.username[0].toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name truncate">{user.username}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 4,
                borderRadius: 6,
              }}
              title="Logout"
            >
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

import React from "react";
import { NavLink } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import Icon from "./Icon";

const items = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/games", label: "Games", icon: "gamepad" },
  { to: "/chat", label: "Chat", icon: "chat" },
  { to: "/proxy", label: "Proxy", icon: "globe" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export default function Taskbar() {
  const { user } = useApp();
  const allItems =
    user?.role === "admin"
      ? [...items.slice(0, 4), { to: "/admin", label: "Admin", icon: "shield" }, items[4]]
      : items;

  return (
    <nav className="taskbar">
      <div className="taskbar-brand">
        <img src="/fluxy-logo.svg" alt="Fluxy logo" className="taskbar-logo-img" />
        <span className="taskbar-logo-text">Fluxy</span>
      </div>
      <div className="taskbar-nav">
        {allItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `taskbar-item${isActive ? " active" : ""}`}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

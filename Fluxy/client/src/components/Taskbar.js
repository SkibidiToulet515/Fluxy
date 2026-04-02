import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Icon from './Icon';

const items = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/games', label: 'Games', icon: 'gamepad' },
  { to: '/chat', label: 'Chat', icon: 'chat' },
  { to: '/proxy', label: 'Proxy', icon: 'globe' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function Taskbar() {
  const { user } = useApp();
  const allItems = user?.role === 'admin'
    ? [...items.slice(0, 4), { to: '/admin', label: 'Admin', icon: 'shield' }, items[4]]
    : items;

  return (
    <nav className="taskbar">
      {allItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `taskbar-item${isActive ? ' active' : ''}`}
        >
          <Icon name={item.icon} size={22} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

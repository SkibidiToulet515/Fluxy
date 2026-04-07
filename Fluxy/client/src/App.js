import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import StarField from './components/StarField';
import Sidebar from './components/Sidebar';
import Taskbar from './components/Taskbar';
import Home from './pages/Home';
import Games from './pages/Games';
import Chat from './pages/Chat';
import Proxy from './pages/Proxy';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import { Login, Register } from './pages/Auth';

function AppInner() {
  const { layout, sidebarCollapsed } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isTaskbar = layout === 'taskbar';

  return (
    <div className={`app-layout${isTaskbar ? ' taskbar-mode' : ''}`}>
      <StarField />

      {!isTaskbar && (
        <>
          {/* Mobile overlay */}
          {mobileOpen && (
            <div
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, backdropFilter: 'blur(4px)' }}
            />
          )}
          <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        </>
      )}

      <div className={`main-content${!isTaskbar && sidebarCollapsed ? ' sidebar-collapsed' : ''}${isTaskbar ? ' taskbar-mode' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/games" element={<Games />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/proxy" element={<Proxy />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>

      {isTaskbar && <Taskbar />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </BrowserRouter>
  );
}

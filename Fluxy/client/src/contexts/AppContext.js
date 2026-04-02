import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('fluxy_token'));
  const [theme, setThemeState] = useState(() => localStorage.getItem('fluxy_theme') || 'glassy');
  const [layout, setLayoutState] = useState(() => localStorage.getItem('fluxy_layout') || 'sidebar');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [proxyEngine, setProxyEngineState] = useState(() => localStorage.getItem('fluxy_proxy') || 'uv');

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (t) => { setThemeState(t); localStorage.setItem('fluxy_theme', t); };
  const setLayout = (l) => { setLayoutState(l); localStorage.setItem('fluxy_layout', l); };
  const setProxyEngine = (e) => { setProxyEngineState(e); localStorage.setItem('fluxy_proxy', e); };

  // Restore session
  useEffect(() => {
    if (token) {
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const stored = localStorage.getItem('fluxy_user');
      if (stored) setUser(JSON.parse(stored));
    }
  }, [token]);

  const login = useCallback(async (username, password) => {
    const { data } = await API.post('/auth/login', { username, password });
    API.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    localStorage.setItem('fluxy_token', data.token);
    localStorage.setItem('fluxy_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (username, password) => {
    const { data } = await API.post('/auth/register', { username, password });
    API.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    localStorage.setItem('fluxy_token', data.token);
    localStorage.setItem('fluxy_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fluxy_token');
    localStorage.removeItem('fluxy_user');
    delete API.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  // Recently played
  const addRecentGame = useCallback((game) => {
    const key = 'fluxy_recent_games';
    const recent = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = recent.filter(g => g.id !== game.id);
    const updated = [{ ...game, playedAt: Date.now() }, ...filtered].slice(0, 12);
    localStorage.setItem(key, JSON.stringify(updated));
  }, []);

  const getRecentGames = useCallback(() => {
    return JSON.parse(localStorage.getItem('fluxy_recent_games') || '[]');
  }, []);

  // Proxy history
  const addProxyHistory = useCallback((url) => {
    const key = 'fluxy_proxy_history';
    const hist = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = hist.filter(u => u.url !== url);
    const updated = [{ url, visitedAt: Date.now() }, ...filtered].slice(0, 20);
    localStorage.setItem(key, JSON.stringify(updated));
  }, []);

  const getProxyHistory = useCallback(() => {
    return JSON.parse(localStorage.getItem('fluxy_proxy_history') || '[]');
  }, []);

  return (
    <AppContext.Provider value={{
      user, token, login, register, logout, API,
      theme, setTheme,
      layout, setLayout,
      sidebarCollapsed, setSidebarCollapsed,
      proxyEngine, setProxyEngine,
      addRecentGame, getRecentGames,
      addProxyHistory, getProxyHistory,
    }}>
      {children}
    </AppContext.Provider>
  );
}

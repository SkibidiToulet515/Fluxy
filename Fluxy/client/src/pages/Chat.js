import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useApp } from '../contexts/AppContext';
import Icon from '../components/Icon';

const ROOMS = [
  { id: 'general', label: 'General', desc: 'Main chat room' },
  { id: 'gaming', label: 'Gaming', desc: 'Talk about games' },
  { id: 'help', label: 'Help', desc: 'Get support' },
];

function formatTime(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const { user, token, API } = useApp();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [room, setRoom] = useState('general');
  const [onlineCount, setOnlineCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load history
  useEffect(() => {
    if (!user || !token) return;
    API.get(`/messages/${room}`).then(({ data }) => setMessages(data)).catch(() => {});
  }, [room, user, token, API]);

  // Socket connection
  useEffect(() => {
    if (!user || !token) return;
    const s = io('/', { transports: ['websocket', 'polling'] });
    s.on('connect', () => {
      setConnected(true);
      s.emit('auth', token);
    });
    s.on('auth_ok', () => {
      s.emit('join_room', room);
    });
    s.on('message', (msg) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    s.on('online_count', setOnlineCount);
    s.on('disconnect', () => setConnected(false));
    setSocket(s);
    return () => s.disconnect();
  }, [user, token]); // eslint-disable-line

  // Switch rooms
  useEffect(() => {
    if (socket && connected) {
      socket.emit('join_room', room);
      API.get(`/messages/${room}`).then(({ data }) => setMessages(data)).catch(() => {});
    }
  }, [room]); // eslint-disable-line

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !socket || !connected) return;
    socket.emit('message', { content: input.trim(), room });
    setInput('');
    inputRef.current?.focus();
  }, [input, socket, connected, room]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!user) {
    return (
      <div className="page animate-fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Icon name="chat" size={48} style={{ color: 'var(--text-muted)' }} />
        <h2 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 700 }}>Sign in to Chat</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Join the conversation with other Fluxy users</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn btn-ghost" onClick={() => navigate('/register')}>Register</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 0px)', overflow: 'hidden' }} className="animate-fade">
      {/* Room sidebar */}
      <div className="chat-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Rooms</div>
          {ROOMS.map(r => (
            <button
              key={r.id}
              onClick={() => setRoom(r.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                background: room === r.id ? 'var(--bg-card-hover)' : 'none',
                border: '1px solid', borderColor: room === r.id ? 'var(--border-accent)' : 'transparent',
                color: room === r.id ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>#{r.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 10 }}>
            <div className="online-dot" />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{onlineCount} online</span>
          </div>
          <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Logged in as</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{user.username}</div>
          </div>
        </div>
      </div>

      {/* Main chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', minWidth: 0 }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: 'var(--bg-secondary)' }}>
          <Icon name="chat" size={18} style={{ color: 'var(--accent)' }} />
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>#{ROOMS.find(r => r.id === room)?.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{connected ? 'Connected' : 'Connecting...'}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className={connected ? 'online-dot' : ''} style={!connected ? { width: 8, height: 8, borderRadius: '50%', background: '#ffa032' } : {}} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{connected ? 'Live' : 'Offline'}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
              <Icon name="chat" size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div>No messages yet. Say hello!</div>
            </div>
          )}
          {messages.map((msg, i) => {
            const isOwn = msg.user_id === user.id || msg.username === user.username;
            const showAvatar = i === 0 || messages[i - 1].username !== msg.username;
            return (
              <div key={msg.id} className={`chat-message${isOwn ? ' own' : ''}`}>
                {showAvatar ? (
                  <div className="chat-avatar" style={{ background: isOwn ? 'var(--accent)' : `hsl(${msg.username.charCodeAt(0) * 15}, 60%, 50%)` }}>
                    {msg.username[0].toUpperCase()}
                  </div>
                ) : <div style={{ width: 34, flexShrink: 0 }} />}
                <div className="chat-bubble-wrap">
                  {showAvatar && <div className="chat-username">{isOwn ? 'You' : msg.username}</div>}
                  <div className={`chat-bubble${isOwn ? ' own' : ''}`}>{msg.content}</div>
                  <div className="chat-time">{formatTime(msg.created_at)}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <input
            ref={inputRef}
            className="input"
            placeholder={`Message #${ROOMS.find(r => r.id === room)?.label}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            maxLength={500}
          />
          <button
            className="btn btn-primary btn-icon"
            onClick={sendMessage}
            disabled={!input.trim() || !connected}
          >
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

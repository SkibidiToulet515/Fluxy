import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import Icon from "../components/Icon";
import {
  generateGameThumbnail,
  resolveGameUrl,
  saveGameLaunch,
  withThumbnail,
} from "../utils/gameUtils";

function Thumbnail({ game }) {
  const [failed, setFailed] = useState(false);
  const title = game.name || game.title || "Game";
  const fallback = useMemo(() => generateGameThumbnail(title), [title]);
  const src = !failed && game.thumbnail ? game.thumbnail : fallback;

  return (
    <img
      src={src}
      alt={title}
      className="game-thumb"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function MiniGameCard({ game, onClick }) {
  return (
    <div className="game-card" onClick={() => onClick(game)} style={{ cursor: "pointer" }}>
      <Thumbnail game={game} />
      <div className="game-info">
        <div className="game-title">{game.name}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontFamily: "monospace" }}>
          {game.filename}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { API, addRecentGame, getRecentGames } = useApp();
  const navigate = useNavigate();
  const [allGames, setAllGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshRecent = useCallback(() => {
    const recent = getRecentGames().slice(0, 8).map(withThumbnail);
    setRecentGames(recent);
  }, [getRecentGames]);

  useEffect(() => {
    let mounted = true;

    API.get("/games/all")
      .then(({ data }) => {
        if (!mounted) return;
        const normalized = Array.isArray(data) ? data.map(withThumbnail) : [];
        setAllGames(normalized);
      })
      .catch(() => {
        if (!mounted) return;
        setAllGames([]);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
          refreshRecent();
        }
      });

    return () => {
      mounted = false;
    };
  }, [API, refreshRecent]);

  const featured = useMemo(() => {
    if (allGames.length <= 8) return allGames;
    const picks = [];
    const step = (allGames.length - 1) / 7;
    for (let i = 0; i < 8; i += 1) {
      picks.push(allGames[Math.round(i * step)]);
    }
    return picks;
  }, [allGames]);

  const trending = useMemo(() => allGames.slice(-8).reverse(), [allGames]);

  const openGame = useCallback(
    async (game) => {
      addRecentGame(game);
      refreshRecent();

      try {
        await API.post(`/games/${game.id}/play`);
      } catch {
        // no-op
      }

      const targetUrl = resolveGameUrl(game.playUrl);
      if (!targetUrl) return;
      saveGameLaunch(game, targetUrl);
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    },
    [API, addRecentGame, refreshRecent]
  );

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="page animate-fade">
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <div className="hero-logo-mark">
            <img src="/fluxy-logo.svg" alt="Fluxy logo" className="hero-logo-img" />
          </div>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
              Welcome to <span style={{ color: "var(--accent)" }}>Fluxy</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
              {allGames.length.toLocaleString()} games - no downloads, play instantly
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          {[
            { label: "Browse Games", icon: "gamepad", to: "/games", primary: true },
            { label: "Open Proxy", icon: "globe", to: "/proxy" },
            { label: "Live Chat", icon: "chat", to: "/chat" },
          ].map((action) => (
            <button
              key={action.to}
              className={`btn ${action.primary ? "btn-primary" : "btn-ghost"}`}
              onClick={() => navigate(action.to)}
            >
              <Icon name={action.icon} size={16} />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {recentGames.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div className="section-header">
            <h2 className="section-title">
              <Icon name="clock" size={17} style={{ color: "var(--accent)" }} />
              Play Again
            </h2>
            <button className="section-link" onClick={() => navigate("/games")}>
              See all games
            </button>
          </div>
          <div className="games-grid">
            {recentGames.map((game) => (
              <MiniGameCard key={game.id} game={game} onClick={openGame} />
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 40 }}>
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-dot" />
            Featured Games
          </h2>
          <button className="section-link" onClick={() => navigate("/games")}>
            See all {allGames.length.toLocaleString()}
          </button>
        </div>
        <div className="featured-grid">
          {featured.map((game) => (
            <MiniGameCard key={game.id} game={game} onClick={openGame} />
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 40 }}>
        <div className="section-header">
          <h2 className="section-title">
            <Icon name="fire" size={18} style={{ color: "#ffa032" }} />
            Recently Added
          </h2>
          <button className="section-link" onClick={() => navigate("/games")}>
            Browse library
          </button>
        </div>
        <div className="games-grid">
          {trending.map((game) => (
            <MiniGameCard key={game.id} game={game} onClick={openGame} />
          ))}
        </div>
      </section>
    </div>
  );
}

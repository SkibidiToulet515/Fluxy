import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useApp } from "../contexts/AppContext";
import Icon from "../components/Icon";
import {
  generateGameThumbnail,
  resolveGameUrl,
  saveGameLaunch,
  withThumbnail,
} from "../utils/gameUtils";

const PAGE_SIZE = 60;
const ALPHABET = [
  "#",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];

function GameTile({ game, onPlay, isRecent }) {
  const [failed, setFailed] = useState(false);
  const title = game.name || game.title || "Game";
  const fallback = useMemo(() => generateGameThumbnail(title), [title]);
  const src = !failed && game.thumbnail ? game.thumbnail : fallback;

  return (
    <div
      className="game-card animate-up"
      onClick={() => onPlay(game)}
      style={{ cursor: "pointer" }}
      title={title}
    >
      <div style={{ position: "relative" }}>
        <img
          src={src}
          alt={title}
          className="game-thumb"
          loading="lazy"
          onError={() => setFailed(true)}
        />
        {isRecent && <span className="game-badge badge-featured">Recent</span>}
      </div>

      <div className="game-info">
        <div className="game-title" style={{ color: "var(--text-primary)" }}>
          {title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 8px var(--accent-glow)",
            }}
          />
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
            {game.filename || "web-game"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Games() {
  const { API, addRecentGame, getRecentGames } = useApp();
  const [allGames, setAllGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [letterFilter, setLetterFilter] = useState("");
  const [page, setPage] = useState(1);
  const [recentIds, setRecentIds] = useState(new Set());
  const [recentVersion, setRecentVersion] = useState(0);
  const searchRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await API.get("/games/all");
        if (!mounted) return;
        const normalized = Array.isArray(data) ? data.map(withThumbnail) : [];
        setAllGames(normalized);
      } catch {
        if (!mounted) return;
        setAllGames([]);
      }

      if (!mounted) return;
      const recent = getRecentGames();
      setRecentIds(new Set(recent.map((game) => game.id)));
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [API, getRecentGames]);

  useEffect(() => {
    setPage(1);
  }, [search, letterFilter]);

  const filtered = useMemo(() => {
    let result = allGames;
    if (letterFilter) {
      if (letterFilter === "#") {
        result = result.filter((game) => !/^[a-zA-Z]/.test(game.name || ""));
      } else {
        result = result.filter((game) => (game.name || "").toUpperCase().startsWith(letterFilter));
      }
    }
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      result = result.filter((game) => (game.name || "").toLowerCase().includes(query));
    }
    return result;
  }, [allGames, search, letterFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const recentGames = useMemo(() => getRecentGames().slice(0, 12).map(withThumbnail), [getRecentGames, recentVersion]);

  const openGame = useCallback(
    async (game) => {
      addRecentGame(game);
      setRecentIds((prev) => new Set([...prev, game.id]));
      setRecentVersion((prev) => prev + 1);

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
    [API, addRecentGame]
  );

  const scrollTop = () => gridRef.current?.scrollIntoView({ behavior: "smooth" });

  const goPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
    scrollTop();
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>Loading games...</span>
      </div>
    );
  }

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h1 className="page-title">Games</h1>
        <p className="page-subtitle">
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>{allGames.length.toLocaleString()}</span> games -
          click any game to open in a new tab
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div className="input-search" style={{ flex: 1, minWidth: 200, maxWidth: 500 }}>
          <Icon name="search" size={16} className="input-search-icon" />
          <input
            ref={searchRef}
            className="input"
            placeholder={`Search ${allGames.length} games...`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoFocus
          />
        </div>
        {(search || letterFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setLetterFilter(""); }}>
            <Icon name="close" size={13} />
            Clear
          </button>
        )}
        <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-muted)" }}>
          {filtered.length.toLocaleString()} results
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          marginBottom: 24,
          padding: "12px 14px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
        }}
      >
        <button
          onClick={() => setLetterFilter("")}
          style={{
            padding: "4px 10px",
            borderRadius: 7,
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 12,
            fontFamily: "Syne",
            background: !letterFilter ? "var(--accent)" : "transparent",
            color: !letterFilter ? "#fff" : "var(--text-muted)",
            transition: "all 0.15s",
          }}
        >
          ALL
        </button>

        {ALPHABET.map((letter) => (
          <button
            key={letter}
            onClick={() => setLetterFilter(letter === letterFilter ? "" : letter)}
            style={{
              width: 30,
              height: 28,
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
              fontFamily: "Syne",
              background: letterFilter === letter ? "var(--accent)" : "transparent",
              color: letterFilter === letter ? "#fff" : "var(--text-muted)",
              transition: "all 0.12s",
            }}
          >
            {letter}
          </button>
        ))}
      </div>

      {!search && !letterFilter && recentGames.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div className="section-header">
            <h2 className="section-title">
              <Icon name="clock" size={17} style={{ color: "var(--accent)" }} />
              Recently Played
            </h2>
          </div>
          <div className="games-grid">
            {recentGames.map((game) => (
              <GameTile key={`rec-${game.id}`} game={game} onPlay={openGame} isRecent={false} />
            ))}
          </div>
        </section>
      )}

      <div ref={gridRef}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <h2 className="section-title">
            <span className="section-dot" />
            {letterFilter ? `${letterFilter} Games` : search ? `Results for "${search}"` : "All Games"}
            <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
              ({filtered.length.toLocaleString()})
            </span>
          </h2>

          {totalPages > 1 && (
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Page {page} of {totalPages}
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ marginBottom: 12, opacity: 0.3 }}>
              <Icon name="gamepad" size={48} />
            </div>
            <div style={{ fontFamily: "Syne", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No games found</div>
            <div className="text-muted">Try another search term or letter.</div>
          </div>
        ) : (
          <div className="games-grid">
            {paginated.map((game) => (
              <GameTile key={game.id} game={game} onPlay={openGame} isRecent={recentIds.has(game.id)} />
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 32,
            flexWrap: "wrap",
          }}
        >
          <button className="btn btn-ghost btn-sm" onClick={() => goPage(1)} disabled={page === 1}>
            First
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => goPage(page - 1)} disabled={page === 1}>
            Prev
          </button>

          {Array.from({ length: Math.min(7, totalPages) }, (_, index) => {
            let pillPage;
            if (totalPages <= 7) pillPage = index + 1;
            else if (page <= 4) pillPage = index + 1;
            else if (page >= totalPages - 3) pillPage = totalPages - 6 + index;
            else pillPage = page - 3 + index;

            return (
              <button
                key={pillPage}
                onClick={() => goPage(pillPage)}
                style={{
                  minWidth: 36,
                  height: 34,
                  padding: "0 10px",
                  borderRadius: 9,
                  border: "1px solid",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                  transition: "all 0.15s",
                  background: page === pillPage ? "var(--accent)" : "var(--bg-card)",
                  borderColor: page === pillPage ? "var(--accent)" : "var(--border)",
                  color: page === pillPage ? "#fff" : "var(--text-secondary)",
                  boxShadow: page === pillPage ? "0 0 12px var(--accent-glow)" : "none",
                }}
              >
                {pillPage}
              </button>
            );
          })}

          <button className="btn btn-ghost btn-sm" onClick={() => goPage(page + 1)} disabled={page === totalPages}>
            Next
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => goPage(totalPages)} disabled={page === totalPages}>
            Last
          </button>
        </div>
      )}

      <div
        style={{
          marginTop: 32,
          padding: "14px 18px",
          borderRadius: 12,
          background: "var(--accent-glow)",
          border: "1px solid var(--border-accent)",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <Icon name="star" size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Game launch notes</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Every launch is saved locally in your browser history for quick replay, and game files are opened from the
            server game directory for reliable loading.
          </div>
        </div>
      </div>
    </div>
  );
}

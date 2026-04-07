import React, { useState, useCallback, useMemo } from "react";
import { useApp } from "../contexts/AppContext";
import Icon from "../components/Icon";
import { getBackendOrigin } from "../utils/gameUtils";

const SEARCH_ENGINES = {
  duckduckgo: {
    label: "DuckDuckGo",
    searchUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}&ia=web`,
    homeUrl: "https://duckduckgo.com",
    color: "#de5833",
    desc: "Private and secure search",
  },
  brave: {
    label: "Brave Search",
    searchUrl: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
    homeUrl: "https://search.brave.com",
    color: "#fb542b",
    desc: "Independent and unbiased",
  },
};

function normalizeUrl(raw, searchEngine = "duckduckgo") {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes(".") && !trimmed.includes(" ")) {
    return `https://${trimmed}`;
  }
  return SEARCH_ENGINES[searchEngine].searchUrl(trimmed);
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function buildProxyUrl(targetUrl, engine) {
  const selectedEngine = engine === "scramjet" ? "scramjet" : "uv";
  const backendOrigin = getBackendOrigin();
  return `${backendOrigin}/proxy/launch/${selectedEngine}?url=${encodeURIComponent(targetUrl)}`;
}

export default function Proxy() {
  const { proxyEngine, setProxyEngine, addProxyHistory, getProxyHistory } = useApp();
  const [urlInput, setUrlInput] = useState("");
  const [activeTargetUrl, setActiveTargetUrl] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [history, setHistory] = useState(() => getProxyHistory());
  const [searchEngine, setSearchEngine] = useState(() => localStorage.getItem("fluxy_search_engine") || "duckduckgo");

  const currentEngine = SEARCH_ENGINES[searchEngine];
  const activeProxyUrl = useMemo(
    () => (activeTargetUrl ? buildProxyUrl(activeTargetUrl, proxyEngine) : ""),
    [activeTargetUrl, proxyEngine]
  );

  const changeSearchEngine = (id) => {
    setSearchEngine(id);
    localStorage.setItem("fluxy_search_engine", id);
  };

  const go = useCallback(
    (raw) => {
      const target = normalizeUrl(raw, searchEngine);
      if (!target) return;
      setActiveTargetUrl(target);
      setUrlInput(target);
      addProxyHistory(target);
      setHistory(getProxyHistory());
      setReloadKey((prev) => prev + 1);
    },
    [searchEngine, addProxyHistory, getProxyHistory]
  );

  const handleEnter = (event) => {
    if (event.key === "Enter") go(urlInput);
  };

  const clearHistory = () => {
    localStorage.removeItem("fluxy_proxy_history");
    setHistory([]);
  };

  if (activeTargetUrl) {
    return (
      <div className="proxy-frame-wrap animate-fade">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "var(--bg-secondary)",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setActiveTargetUrl("")} title="Back">
            <Icon name="chevronLeft" size={16} />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setReloadKey((prev) => prev + 1)} title="Refresh">
            <Icon name="refresh" size={14} />
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 10px",
              borderRadius: 8,
              background: `${currentEngine.color}18`,
              border: `1px solid ${currentEngine.color}40`,
              flexShrink: 0,
            }}
          >
            <Icon name="search" size={14} style={{ color: currentEngine.color }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: currentEngine.color }}>{currentEngine.label}</span>
          </div>

          <div className="proxy-bar" style={{ flex: 1 }}>
            <Icon name="globe" size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              className="proxy-input"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              onKeyDown={handleEnter}
              placeholder={`Search with ${currentEngine.label} or enter URL...`}
              style={{ flex: 1, fontSize: 13 }}
            />
          </div>

          <select className="proxy-engine-select" value={proxyEngine} onChange={(event) => setProxyEngine(event.target.value)}>
            <option value="uv">Ultraviolet</option>
            <option value="scramjet">Scramjet</option>
          </select>

          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => window.open(activeProxyUrl, "_blank")} title="Open proxy tab">
            <Icon name="external" size={14} />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => window.open(activeTargetUrl, "_blank")} title="Open direct tab">
            <Icon name="unlock" size={14} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => go(urlInput)} style={{ background: currentEngine.color }}>
            <Icon name="play" size={14} />
            Go
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveTargetUrl("")}>
            <Icon name="close" size={14} />
            Exit
          </button>
        </div>

        <div
          style={{
            padding: "5px 14px",
            background: "rgba(0,0,0,0.22)",
            borderBottom: "1px solid var(--border)",
            fontSize: 11,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>Engine: {proxyEngine === "uv" ? "Ultraviolet" : "Scramjet"}</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>Target: {activeTargetUrl.slice(0, 120)}{activeTargetUrl.length > 120 ? "..." : ""}</span>
        </div>

        <iframe
          key={reloadKey}
          src={activeProxyUrl}
          title="Proxy Browser"
          style={{ flex: 1, border: "none", width: "100%" }}
          allow="fullscreen; clipboard-write; autoplay"
        />
      </div>
    );
  }

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h1 className="page-title">Proxy Browser</h1>
        <p className="page-subtitle">Browse through Fluxy proxy engines without iframe blocks.</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "1.2px",
            color: "var(--text-muted)",
            marginBottom: 10,
          }}
        >
          Search Engine
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Object.entries(SEARCH_ENGINES).map(([id, engine]) => (
            <button
              key={id}
              onClick={() => changeSearchEngine(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                borderRadius: 12,
                cursor: "pointer",
                background: searchEngine === id ? `${engine.color}15` : "var(--bg-card)",
                border: `2px solid ${searchEngine === id ? engine.color : "var(--border)"}`,
                transition: "all 0.16s",
                minWidth: 210,
              }}
            >
              <Icon name="search" size={16} style={{ color: engine.color }} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 14, color: searchEngine === id ? engine.color : "var(--text-primary)" }}>
                  {engine.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{engine.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "1.2px",
            color: "var(--text-muted)",
            marginBottom: 10,
          }}
        >
          Proxy Engine
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { id: "uv", label: "Ultraviolet", desc: "Stable and fast proxy route" },
            { id: "scramjet", label: "Scramjet", desc: "Alternate route with same fallback" },
          ].map((engine) => (
            <button
              key={engine.id}
              onClick={() => setProxyEngine(engine.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "12px 16px",
                borderRadius: 12,
                cursor: "pointer",
                background: proxyEngine === engine.id ? "var(--accent-glow)" : "var(--bg-card)",
                border: `1px solid ${proxyEngine === engine.id ? "var(--border-accent)" : "var(--border)"}`,
                transition: "all 0.16s",
              }}
            >
              <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 13, color: proxyEngine === engine.id ? "var(--accent)" : "var(--text-primary)" }}>
                {engine.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{engine.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "6px 8px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 28,
        }}
      >
        <Icon name="globe" size={16} style={{ color: "var(--text-muted)", marginLeft: 6 }} />
        <input
          className="proxy-input"
          value={urlInput}
          onChange={(event) => setUrlInput(event.target.value)}
          onKeyDown={handleEnter}
          placeholder={`Search with ${currentEngine.label} or enter URL...`}
          style={{ flex: 1, fontSize: 15, padding: "8px 0" }}
          autoFocus
        />
        <button className="btn btn-primary btn-sm" onClick={() => go(urlInput)} style={{ background: currentEngine.color }}>
          <Icon name="play" size={14} />
          Go
        </button>
      </div>

      <div style={{ marginBottom: 30 }}>
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-dot" />
            Quick Access
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {[
            currentEngine.homeUrl,
            "https://duckduckgo.com",
            "https://search.brave.com",
            "https://wikipedia.org",
            "https://github.com",
            "https://reddit.com",
          ].map((site) => (
            <button key={site} className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => go(site)}>
              <Icon name="globe" size={15} />
              {site.replace(/^https?:\/\//, "")}
            </button>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div>
          <div className="section-header">
            <h2 className="section-title">
              <Icon name="clock" size={16} style={{ color: "var(--accent)" }} />
              Recent Sites
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={clearHistory}>
              <Icon name="trash" size={13} />
              Clear
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.slice(0, 10).map((item, index) => (
              <div key={`${item.url}-${index}`} className="proxy-history-item" onClick={() => go(item.url)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Icon name="globe" size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  <span className="proxy-url truncate">{item.url}</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0, marginLeft: 12 }}>
                  {timeAgo(item.visitedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

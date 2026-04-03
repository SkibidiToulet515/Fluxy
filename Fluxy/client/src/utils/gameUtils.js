const THUMBNAIL_COLORS = [
  ["#6E56FF", "#A07BFF", "#1D1640"],
  ["#FF56B8", "#FF8FD2", "#3A102C"],
  ["#50A0DC", "#8BC7EF", "#10293B"],
  ["#FF64A0", "#FF97C0", "#3D1027"],
  ["#50C8A0", "#7AE0BD", "#10372B"],
  ["#FFB41E", "#FFD16B", "#3D2B08"],
  ["#BE78FF", "#D8ABFF", "#2B163F"],
  ["#FF3C1E", "#FF846E", "#3B120C"],
  ["#82A0FF", "#ADC1FF", "#18264A"],
  ["#00FFB4", "#7BFFD7", "#08362A"],
];

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function generateGameThumbnail(name) {
  const cleanName = safeText(name) || "Game";
  const hash = hashString(cleanName.toLowerCase());
  const palette = THUMBNAIL_COLORS[hash % THUMBNAIL_COLORS.length];
  const initial = cleanName[0] ? cleanName[0].toUpperCase() : "G";
  const accent = palette[0];
  const glow = palette[1];
  const bg = palette[2];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${glow}" stop-opacity="0.6" />
          <stop offset="100%" stop-color="${glow}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="640" height="400" fill="url(#bg)" />
      <circle cx="320" cy="170" r="170" fill="url(#glow)" />
      <rect x="20" y="20" width="600" height="360" rx="18" fill="none" stroke="rgba(255,255,255,0.18)" />
      <text x="320" y="230" text-anchor="middle" fill="white" opacity="0.92"
        font-family="Arial, sans-serif" font-size="180" font-weight="700">${initial}</text>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

export function withThumbnail(game) {
  if (!game) return game;
  if (safeText(game.thumbnail)) return game;
  const title = safeText(game.name) || safeText(game.title) || "Game";
  return { ...game, thumbnail: generateGameThumbnail(title) };
}

export function getBackendOrigin() {
  const configured = safeText(process.env.REACT_APP_API_ORIGIN);
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (typeof window === "undefined") {
    return "http://localhost:3001";
  }

  const { protocol, hostname, port, origin } = window.location;
  if (port === "3000") {
    return `${protocol}//${hostname}:3001`;
  }

  return origin;
}

export function resolveGameUrl(playUrl) {
  const url = safeText(playUrl);
  if (!url) return "";
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:")) return url;

  const backendOrigin = getBackendOrigin();

  if (url.startsWith("/games/")) {
    return `${backendOrigin}${url}`;
  }
  if (url.startsWith("/")) {
    return typeof window !== "undefined" ? `${window.location.origin}${url}` : `${backendOrigin}${url}`;
  }

  return `${backendOrigin}/${url.replace(/^\.?\//, "")}`;
}

export function saveGameLaunch(game, url) {
  if (typeof window === "undefined") return;

  const key = "fluxy_game_sessions";
  const raw = window.localStorage.getItem(key);
  let sessions = [];
  try {
    sessions = raw ? JSON.parse(raw) : [];
  } catch {
    sessions = [];
  }

  const entryId = safeText(game?.id) || safeText(game?.filename) || safeText(game?.name) || `game-${Date.now()}`;
  const entry = {
    id: entryId,
    name: safeText(game?.name) || safeText(game?.title) || "Game",
    filename: safeText(game?.filename),
    playUrl: safeText(url),
    playedAt: Date.now(),
  };

  const next = [entry, ...sessions.filter((item) => item?.id !== entry.id)].slice(0, 150);
  window.localStorage.setItem(key, JSON.stringify(next));
  window.localStorage.setItem("fluxy_last_game", JSON.stringify(entry));
}

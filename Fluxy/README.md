# ⚡ Fluxy — Gaming Platform

**2,750 games** sourced entirely from your local game files. No external dependencies, no iframes from third-party sites — your files, your server.

---

## 🚀 Quick Start

### Step 1 — Tell Fluxy where your game files are

Set the `GAMES_DIR` environment variable to the folder containing your `.html` game files.

**Windows (Command Prompt):**
```
set GAMES_DIR=C:\Users\yusof\Downloads\UGS Files
```

**Windows (PowerShell):**
```
$env:GAMES_DIR="C:\Users\yusof\Downloads\UGS Files"
```

### Step 2 — Install and run
```
cd fluxy\server
npm install
node index.js
```

Open **http://localhost:3001**



---

## 🎮 How Games Work

- The `server/db/games.json` file is the **single source of truth** for all 2,750 games
- Each entry has: `name` (displayed in UI), `original file name` (used to find the file), `path` (reference only)
- When a user clicks a game, Fluxy opens `/games/{filename}` in a new browser tab
- The server maps `/games/` → your `GAMES_DIR` folder via Express static middleware
- Play counts are tracked in `server/db/fluxy-db.json`

```
games.json entry:
  "name": "1 V 1 Lol"          ← shown in the UI
  "original file name": "cl1v1lol.html"  ← served as /games/cl1v1lol.html
  "path": "C:\...\cl1v1lol.html"         ← original location (reference)

Server maps:
  GET /games/cl1v1lol.html  →  GAMES_DIR\cl1v1lol.html  →  browser plays it
```

---

## 📁 Structure

```
fluxy/
├── client/
│   └── build/              ← Pre-built React (no client install needed)
└── server/
    ├── index.js            ← Entry: API + /games/ static + React build
    ├── db/
    │   ├── games.json      ← YOUR 2,750 games (source of truth)
    │   └── database.js     ← JSON DB for users, chat, play stats
    └── routes/
        ├── games.js        ← Reads games.json, serves /api/games/all
        ├── auth.js
        ├── admin.js
        └── messages.js
```

---

## 🔧 Environment Variables

| Variable    | Default                    | Description                        |
|-------------|----------------------------|------------------------------------|
| `GAMES_DIR` | `../games` (next to server)| Path to your HTML game files folder|
| `PORT`      | `3001`                     | Server port                        |
| `JWT_SECRET`| `fluxy_secret_key_2024`    | Auth secret (change in production) |

---

## 🎨 Features

- **2,750 games** — all loaded from `games.json`, served from your local files
- **A–Z filter bar** — jump to any letter instantly  
- **Search** — live search across all 2,750 game names
- **Pagination** — 60 games per page
- **Recently Played** — stored in LocalStorage, shown on Home and Games pages
- **10 themes** — Glassy, Moonlight, Haze, Steel, Blossom, Obsidian, NeonGrid, Aurora, Carbon, Solar
- **Sidebar + Taskbar** layout modes
- **Real-time chat** — Socket.io with rooms
- **Proxy browser** — DuckDuckGo/Brave + UV/Scramjet engines
- **Admin panel** — manage bookmarklets, bypasses, view stats

# Fluxy

Fluxy is a self-hosted gaming platform focused on running your own HTML game library.
It includes a React frontend, a Node/Express API, Socket.IO chat, and an admin area.

## What This Site Is About

- Browse and launch your local game files from one UI
- Keep game metadata in JSON so the library is easy to manage
- Track play counts and basic activity
- Use built-in chat rooms and admin tools

By default, games are served from:
`Fluxy/client/UGS Files`

## Tech Stack

- Frontend: React (Create React App)
- Backend: Node.js + Express
- Realtime: Socket.IO
- Data: JSON files (`server/db`)

## Local Start Tutorial

### 1) Open the project folder

```powershell
cd "C:\Users\yusof\Downloads\fluxy\Fluxy"
```

### 2) Install dependencies

```powershell
npm run install:all
```

If the client install fails with a `core-js` postinstall/path error, run:

```powershell
cd client
npm install --ignore-scripts
cd ..
```

### 3) Start backend (Terminal 1)

```powershell
cd "C:\Users\yusof\Downloads\fluxy\Fluxy\server"
node index.js
```

Backend URL:
`http://localhost:3001`

Health check:
`http://localhost:3001/api/health`

### 4) Start frontend (Terminal 2)

```powershell
cd "C:\Users\yusof\Downloads\fluxy\Fluxy\client"
node_modules\.bin\react-scripts.cmd start
```

Frontend URL:
`http://localhost:3000`

## Game Files Path

Default game path in the server:
`../client/UGS Files`

To override the game path:

Command Prompt:

```cmd
set GAMES_DIR=C:\path\to\your\games
```

PowerShell:

```powershell
$env:GAMES_DIR = "C:\path\to\your\games"
```

Then restart the backend.

## Admin Login (Testing)

- Username: `admin`
- Password: `fluxy_admin_2024`

## Project Structure

```text
Fluxy/
  client/
    public/
    src/
    UGS Files/
  server/
    db/
    middleware/
    routes/
    index.js
```

## Notes for Hosting

- Build the client before production deploy:

```powershell
cd client
node_modules\.bin\react-scripts.cmd build
```

- Start the server in production:

```powershell
cd ../server
node index.js
```

The Express server serves both API routes and the built React app.
# Fluxy

Fluxy is a self-hosted gaming platform for running and organizing your own HTML game library.
It has a React frontend, a Node/Express backend, Socket.IO chat, and admin tooling.

## What The Site Is About

- Launch local HTML games from one place
- Manage game metadata in JSON
- Track play counts and usage
- Provide chat rooms and admin tools for your community

By default, games are served from:
`Fluxy/client/UGS Files`

## Stack

- Frontend: React (Create React App)
- Backend: Node.js + Express
- Realtime: Socket.IO
- Data: JSON files in `server/db`

## Local Start Tutorial

### 1. Open the project folder

```powershell
cd "C:\Users\yusof\Downloads\fluxy\Fluxy"
```

### 2. Install dependencies

```powershell
npm run install:all
```

If client install fails with a `core-js` postinstall/path error, run:

```powershell
cd client
npm install --ignore-scripts
cd ..
```

### 3. Start backend (Terminal 1)

```powershell
cd "C:\Users\yusof\Downloads\fluxy\Fluxy\server"
node index.js
```

Backend:
`http://localhost:3001`

Health check:
`http://localhost:3001/api/health`

### 4. Start frontend (Terminal 2)

```powershell
cd "C:\Users\yusof\Downloads\fluxy\Fluxy\client"
node_modules\.bin\react-scripts.cmd start
```

Frontend:
`http://localhost:3000`

## Game Files Path

Default game path used by the server:
`../client/UGS Files`

To override it:

Command Prompt:

```cmd
set GAMES_DIR=C:\path\to\your\games
```

PowerShell:

```powershell
$env:GAMES_DIR = "C:\path\to\your\games"
```

Then restart the backend.

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

## Hosting Notes

Build frontend for production:

```powershell
cd client
node_modules\.bin\react-scripts.cmd build
```

Start backend for production:

```powershell
cd ../server
node index.js
```

The Express server serves both API routes and the built React app.
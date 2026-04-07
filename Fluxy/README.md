# Fluxy

Fluxy is a gaming platform for launching and organizing your HTML game library, with auth, chat, proxy tools, and admin management.

## What The Site Is About

- Launch your game library from one dashboard
- Manage game metadata from admin tools
- Track game plays and activity stats
- Handle users, auth, and content from a cloud database

## Stack

- Frontend: React (Create React App)
- Backend: Node.js + Express
- Realtime: Socket.IO
- Cloud DB: Firebase Firestore (with local JSON fallback for development)

## Local Start

### 1. Open the project

```powershell
cd "C:\Users\yusof\Downloads\Chibi Clash\fluxy_clean\Fluxy"
```

### 2. Install all dependencies

```powershell
npm run install:all
```

### 3. Start backend (Terminal 1)

```powershell
npm run dev:server
```

Backend health:
`http://localhost:3001/api/health`

### 4. Start frontend (Terminal 2)

```powershell
npm run dev:client
```

Frontend:
`http://localhost:3000`

## Database Modes

### Firestore mode (recommended)

Set these in `server/.env` (see `server/.env.example`):

```env
FIRESTORE_ENABLED=true
JWT_SECRET=replace-with-a-strong-secret
```

When Firestore is enabled, Fluxy stores users, games, bookmarklets, bypasses, messages, and game stats in Firestore.

### Local fallback mode

If Firestore is not enabled/configured, Fluxy uses:
`server/db/fluxy-db.json`

## Firebase Hosting + Functions Deployment

### 1. Build frontend

```powershell
npm run build
```

### 2. Configure Firebase project

1. Install Firebase CLI
2. Create or choose a Firebase project
3. Copy `.firebaserc.example` to `.firebaserc`
4. Set your project id in `.firebaserc`

### 3. Enable Firestore

Enable Firestore in your Firebase console.

### 4. Set server environment values

Create `server/.env` with at least:

```env
FIRESTORE_ENABLED=true
JWT_SECRET=replace-with-a-strong-secret
```

Optional:

```env
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=fluxy_admin_2024
```

### 5. Deploy

```powershell
npm run deploy:firebase
```

This deploys:

- Hosting from `client/build`
- Functions from `server` (HTTP function `api`)
- Firestore rules from `firestore.rules`

## Notes

- `firebase.json` already rewrites `/api/**` and required backend paths to the `api` function.
- Firestore direct client access is blocked by default rules; data is managed through your backend routes.
- Game files are served from:
  - `client/UGS Files` locally
  - For Firebase, host game assets in a public/CDN-accessible location or keep using backend-served paths.

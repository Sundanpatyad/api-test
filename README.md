# SyncNest API Studio

> 🚀 A production-ready, Postman-alternative API Testing Platform with real-time team collaboration built on Tauri + React + Next.js + MongoDB + Socket.IO.

![SyncNest API Studio](https://img.shields.io/badge/SyncNest-API%20Studio-7c3aed?style=for-the-badge)
![Tauri](https://img.shields.io/badge/Tauri-1.6-24C8DB?style=flat-square&logo=tauri)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Next.js](https://img.shields.io/badge/Next.js-14-000?style=flat-square&logo=next.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Tauri Desktop App                            │
│     React + Vite + Tailwind + Zustand + Monaco Editor          │
│     ├── Executes API requests via Rust reqwest (SSRF safe)     │
│     ├── Imports Postman collections                             │
│     └── Real-time sync via Socket.IO client                    │
└──────────┬──────────────────────────────────┬──────────────────┘
           │ HTTP (REST)                       │ WebSocket
           ▼                                   ▼
┌────────────────────┐             ┌─────────────────────┐
│  Next.js Backend   │             │  Socket.IO Server    │
│  (Vercel)          │             │  (Render/Railway)    │
│  ├── Auth (JWT)    │             │  ├── team:{teamId}   │
│  ├── Teams/Projects│             │  ├── request events  │
│  ├── Collections   │             │  └── import events   │
│  └── Import API    │             └─────────────────────┘
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│  MongoDB Atlas     │
│  (Free tier)       │
│  Users/Teams/      │
│  Collections/Reqs  │
└────────────────────┘
```

---

## 📁 Project Structure

```
syncnest-api-studio/
├── apps/
│   ├── backend/          # Next.js API (deploy to Vercel)
│   │   ├── app/api/      # Auth, Team, Project, Collection, Request, Import ...
│   │   ├── lib/          # db.js, auth.js
│   │   └── models/       # 8 Mongoose models
│   ├── realtime/         # Socket.IO server (deploy to Render)
│   │   └── server.js
│   └── desktop/          # Tauri + React desktop app
│       ├── src/
│       │   ├── components/  # Sidebar, RequestBuilder, ResponseViewer ...
│       │   ├── store/       # 7 Zustand stores
│       │   └── utils/       # Postman parser, helpers
│       └── src-tauri/    # Rust backend
│           └── src/      # main.rs, commands/http.rs, security.rs
└── package.json          # Workspace root
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.x |
| Rust | Latest stable (via `rustup`) |
| npm | ≥ 9.x |

Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

---

### 1. Clone & Install

```bash
git clone <your-repo>
cd syncnest-api-studio

# Install all workspace deps
npm install

# Install backend deps
cd apps/backend && npm install && cd ../..

# Install realtime deps
cd apps/realtime && npm install && cd ../..

# Install desktop deps
cd apps/desktop && npm install && cd ../..
```

---

### 2. Configure Environment

**Backend** (`apps/backend/.env`):
```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/syncnest
JWT_SECRET=your-super-secret-key-min-32-characters
```

**Realtime** (`apps/realtime/.env`):
```env
PORT=4000
CORS_ORIGIN=tauri://localhost,http://localhost:5173
```

**Desktop** (`apps/desktop/.env`):
```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:4000
```

---

### 3. Start Development

```bash
# Terminal 1 — Backend
cd apps/backend
npm run dev

# Terminal 2 — Realtime server
cd apps/realtime
npm start

# Terminal 3 — Desktop App (Tauri)
cd apps/desktop
npm run tauri:dev
```

---

## 🌐 Deployment

### Backend → Vercel

1. Push `apps/backend/` to GitHub
2. Connect to Vercel → New Project → Import repo
3. Set root directory: `apps/backend`
4. Add environment variables in Vercel dashboard
5. Deploy → Get URL: `https://syncnest-backend.vercel.app`

### Realtime → Render

1. Create new Web Service on render.com
2. Connect GitHub repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Root: `apps/realtime`
6. Add `CORS_ORIGIN=tauri://localhost` env var

### Desktop → Tauri Build

```bash
cd apps/desktop

# Update .env with production URLs
VITE_API_URL=https://syncnest-backend.vercel.app
VITE_SOCKET_URL=https://syncnest-realtime.onrender.com

# Build for current platform
npm run tauri:build

# Output: src-tauri/target/release/bundle/
# macOS: .dmg / .app
# Windows: .msi / .exe
# Linux: .AppImage / .deb
```

---

## ✨ Features

| Feature | Details |
|---------|---------|
| Request Builder | All HTTP methods, Monaco JSON editor |
| Response Viewer | Pretty JSON, Raw, Headers, Status/Time/Size |
| Collections | Nested folders, Postman collection import |
| Environments | Variable substitution `{{key}}`, secret values |
| Real-time Sync | Live request/collection updates across team |
| Auth | JWT, bcrypt, secure signup/login |
| Teams | Roles: admin/developer/viewer, email invite |
| SSRF Protection | Blocks localhost, 10.x, 192.168.x, 172.16-31.x |
| Keyboard Shortcuts | ⌘+Enter to send, ⌘+S to save |
| Postman Import | v2 / v2.1 JSON, nested folders, all auth types |

---

## 🔒 Security

- **SSRF protection** in Rust: all private IP ranges blocked
- **JWT authentication** with 7-day expiry
- **bcrypt** password hashing (12 rounds)
- **Rate limiting** recommended via Vercel middleware
- **Input sanitization** via Mongoose validators
- **CSP headers** configured in tauri.conf.json

---

## 🔑 API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/signup` | POST | No | Register |
| `/api/auth/login` | POST | No | Login |
| `/api/auth/me` | GET | Yes | Get profile |
| `/api/team` | GET/POST | Yes | List/Create teams |
| `/api/team/:id` | GET/PUT/DELETE | Yes | Team CRUD |
| `/api/team/:id/invite` | POST | Yes | Invite by email |
| `/api/project` | GET/POST | Yes | List/Create |
| `/api/collection` | GET/POST | Yes | List/Create |
| `/api/request` | GET/POST | Yes | List/Create |
| `/api/import` | POST | Yes | Postman import |
| `/api/environment` | GET/POST | Yes | List/Create |
| `/api/comment` | GET/POST | Yes | Comments |

---

## 🔌 Socket Events

| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `join_team` | `{ teamId, user }` |
| Client → Server | `update_request` | `{ teamId, request, userId }` |
| Client → Server | `update_collection` | `{ teamId, collection, userId }` |
| Client → Server | `import_collection` | `{ teamId, collection, requestCount, userId }` |
| Server → Client | `request_updated` | `{ request, userId, timestamp }` |
| Server → Client | `collection_updated` | `{ collection, userId, timestamp }` |
| Server → Client | `collection_imported` | `{ collection, requestCount, timestamp }` |
| Server → Client | `member_joined` | `{ user, members }` |

---

## 📄 License

MIT © SyncNest Team

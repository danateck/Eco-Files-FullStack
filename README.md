# Eco‑Files Full‑Stack

- Frontend: your existing Eco‑Files (GitHub Pages OK)
- Backend: Node/Express (server/)
- Database: **Supabase** Postgres (free) — no Neon

## Quick start
1) Create free Supabase project → copy **psql** connection string
2) In `server/sql/schema.sql`, copy & run in Supabase SQL Editor
3) `cp server/.env.example server/.env` → paste your `DATABASE_URL` + `CORS_ORIGIN`
4) `cd server && npm install && npm run dev` (http://localhost:8787)
5) In `src/api-bridge.js` set `API_BASE` to your deployed server URL
6) Deploy server to Render (free), set env vars
7) Push frontend to GitHub Pages — it will call your API

## Files you may edit
- `src/api-bridge.js`: overrides `loadDocuments` and `uploadDocument` only.
- Your UI, styles, Firebase auth stay the same.

## Security
- When ready, remove `X-Dev-Email` fallback in server and send Firebase ID token.

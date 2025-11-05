# Eco‑Docs API (Express + Supabase Postgres, free)

## 1) Create a free Supabase project
- Go to https://supabase.com → New Project (free tier)
- Open **Database settings → Connection string (psql)** and copy it
  e.g. `postgresql://postgres:YOUR-PASSWORD@db.xxx.supabase.co:5432/postgres?sslmode=require`
- In **SQL editor**, run the contents of `sql/schema.sql` to create tables.

## 2) Configure environment
- Copy `.env.example` → `.env` and paste your Supabase `DATABASE_URL`
- Set `CORS_ORIGIN` to your exact GitHub Pages site (and localhost for dev)

## 3) Run locally
```bash
cd server
npm install
npm run dev
```
API will run on http://localhost:8787

## 4) Deploy (Render – free)
- Create new **Web Service**, root dir = `server`
- Start command: `npm start`
- Env vars: `DATABASE_URL`, `CORS_ORIGIN` (+ optional Firebase Admin vars)
- Deploy → copy the URL (e.g. https://eco-docs-api.onrender.com)

## 5) Frontend
- Point your frontend `API_BASE` to the Render URL.
- Use `api-bridge.js` (in public/) to override `loadDocuments` and `uploadDocument`.

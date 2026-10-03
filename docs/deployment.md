# 🚀 Vercel & Cloud Deployment Guide

This repository is configured for direct deployment on **Vercel** with full-stack support:
- **Frontend**: React 19 + Vite SPA built automatically by Vercel.
- **Backend**: Python FastAPI serverless functions running on Vercel at `/api/*` via `api/index.py`.

---

## ⚡ Option 1: One-Click Deploy via Vercel Dashboard (Recommended)

1. **Log in to Vercel**: Visit [https://vercel.com](https://vercel.com).
2. **Add New Project**:
   - Click **"Add New..."** → **"Project"**.
   - Select your GitHub repository: `SanthoshG0wda/prism`.
3. **Configure Project Settings**:
   - **Framework Preset**: *Vite* (or *Other*)
   - **Root Directory**: `./` (leave as repository root)
   - **Build Command**: `cd frontend && npm install && npm run build` (pre-configured in `vercel.json`)
   - **Output Directory**: `frontend/dist` (pre-configured in `vercel.json`)
4. **Environment Variables (Optional)**:
   - `NVIDIA_API_KEY`: *(Optional)* Your NVIDIA NIM API key (`nvapi-...`). If omitted, the app runs in built-in offline heuristic mode with zero errors!
   - `APP_ENV`: `production`
5. **Deploy**:
   - Click **"Deploy"**.
   - Vercel will install dependencies, build the React SPA, package the Python backend, and provide a live URL (e.g., `https://prism-data-analyst.vercel.app`).

---

## 💻 Option 2: Deploy via Vercel CLI

From your terminal in the repository root:

```bash
# 1. Login to Vercel
npx vercel login

# 2. Deploy preview build
npx vercel

# 3. Deploy to production
npx vercel --prod
```

---

## 🐳 Option 3: Docker-Based Cloud Deployment (Render / Railway)

If you prefer deploying the complete Docker container with a single command:

### On Render / Railway:
1. Connect your GitHub repository `SanthoshG0wda/prism`.
2. Select **"Docker"** as the runtime environment.
3. Render / Railway will automatically detect `docker-compose.yml` and `backend/Dockerfile`.
4. Set the port to `8000`.

---

## ⚙️ Architecture on Vercel

```text
Incoming Request
       │
       ├── /api/* ─────────► Vercel Serverless Function (api/index.py ➔ FastAPI)
       │                         ├── DuckDB in-memory engine
       │                         ├── SQLite session store (/tmp/sessions.db)
       │                         └── 7-Step Analytical Agent
       │
       └── /* ─────────────► Static React SPA (frontend/dist/index.html)
```

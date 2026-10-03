# Prism Frontend (React + Vite + Plotly)

[![Monorepo](https://img.shields.io/badge/GitHub-Monorepo-181717?logo=github)](https://github.com/SanthoshG0wda/prism)
[![Backend Repo](https://img.shields.io/badge/GitHub-Backend_Repo-181717?logo=github)](https://github.com/SanthoshG0wda/prism-backend)
[![Live Web App](https://img.shields.io/badge/Vercel-Live%20App-black?logo=vercel)](https://prism-frontend-wine.vercel.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)
[![Plotly](https://img.shields.io/badge/Plotly.js-Interactive-3F4F75?logo=plotly)](https://plotly.com/javascript/)

> 🌐 **Live Web Application**: [https://prism-frontend-wine.vercel.app](https://prism-frontend-wine.vercel.app)  
> 🔌 **Connected Production Backend**: [https://prism-backend-tau.vercel.app](https://prism-backend-tau.vercel.app)  
> 📦 **Primary Submission Monorepo**: [https://github.com/SanthoshG0wda/prism](https://github.com/SanthoshG0wda/prism)  
> 🎯 **Assignment**: Digital Back Office Software Engineer Intern Assignment

---

## 📌 Overview

This is the standalone **Vite + React Single Page Application** for **Prism**, a conversational AI Data Analyst. It features a modern, ChatGPT & Claude-inspired design language with interactive Plotly visualizations, Claude-style Artifact panels, per-conversation session isolation, and interactive Slash Commands.

The application is completely decoupled and deployed independently to Vercel.

---

## 🌟 Key Features

1. **ChatGPT & Claude-Inspired UX**:
   - Sleek dark aesthetic with responsive layouts and subtle glassmorphic styling.
   - Interactive prompt cards, real-time thinking accordions, and execution traces.
   - Transparent SQL and Pandas code audit drawers with copy buttons.

2. **Interactive Slash Commands (`/`)**:
   - Type `/` or click the **`/`** quick launcher button to trigger special capabilities:
     - `/dashboard`: Generates an interactive Executive Dashboard artifact with KPI cards & quality audits.
     - `/anomalies`: Runs Tukey IQR fences and Z-score outlier detection.
     - `/quality`: Evaluates data completeness and structural health.
     - `/profile`: Generates statistical column distributions and schemas.
     - `/sql`: Formulates and executes DuckDB analytical SQL queries.
     - `/forecast`: Computes predictive trend lines with 95% confidence intervals.
     - `/chart`: Creates interactive Plotly bar, line, scatter, or pie charts.
   - Complete keyboard navigation (`↑`/`↓` arrows to browse, `Enter` to run, `Esc` to close).

3. **Per-Conversation Session & Dataset Isolation**:
   - Each chat conversation generates and maintains its own dedicated session ID.
   - Creating a **New Chat** gives a completely clean slate with zero lingering files in context.
   - Switching between past chats restores that specific conversation's active datasets and artifacts.

4. **Multi-File CSV Upload**:
   - Drag-and-drop upload zone and paperclip attachment directly in the input bar.
   - Attached files render interactive pill cards showing file names and sizes before submission.

5. **Claude-Style Executive Artifact Panel**:
   - Side drawer displaying interactive KPI cards, dataset completeness gauges, and category distributions.

6. **Interactive Visualizations (Plotly.js)**:
   - Dynamic bar, line, scatter, pie/donut, histogram, and box charts with zero latency and responsive redraws.

---

## 📁 Repository Structure

```
├── src/
│   ├── components/
│   │   ├── ArtifactPanel.jsx    # Claude-style Executive Dashboard artifact panel
│   │   ├── ChatArea.jsx         # Chat feed, slash command palette, input & attachments
│   │   ├── ChartRenderer.jsx    # Responsive Plotly chart component
│   │   ├── DashboardView.jsx    # Standalone executive dashboard view
│   │   ├── MarkdownRenderer.jsx # GitHub-flavored markdown renderer
│   │   ├── SettingsModal.jsx    # LLM provider and API key configuration modal
│   │   └── Sidebar.jsx          # Conversation history, dataset switcher, and new chat
│   ├── App.jsx                  # Main application state, session manager, and API client
│   ├── main.jsx                 # React root mounting
│   └── index.css                # Global theme, typography, and dark mode tokens
├── public/                      # Static assets and icons
├── index.html                   # HTML template
├── package.json                 # Node.js dependencies and scripts
└── vite.config.js               # Vite build configuration and dev proxy
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js 18+
- npm or pnpm

### 2. Installation
```bash
# Clone the standalone repository
git clone https://github.com/SanthoshG0wda/prism-frontend.git
cd prism-frontend

# Install dependencies
npm install
```

### 3. Environment Variables
Create a `.env` or `.env.local` file to specify the backend API URL:
```bash
# Point to your local FastAPI backend (default during development)
VITE_API_URL=http://localhost:8000

# Or point to the live Vercel production backend
# VITE_API_URL=https://prism-backend-tau.vercel.app
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Building for Production
```bash
npm run build
```
Compiled production assets will be output to `dist/`.

---

## 🔗 Related Repositories
- **Primary Monorepo**: [https://github.com/SanthoshG0wda/prism](https://github.com/SanthoshG0wda/prism)
- **Standalone Backend**: [https://github.com/SanthoshG0wda/prism-backend](https://github.com/SanthoshG0wda/prism-backend)

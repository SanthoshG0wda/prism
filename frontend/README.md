# AI Data Analyst - Frontend

ChatGPT / Gemini styled React.js Single Page Application built with Vite, Tailwind-grade custom styling, Lucide icons, and Plotly interactive visualizations.

## Features
- **ChatGPT & Gemini Design Language**: Sleek dark aesthetic, card prompt chips, step-by-step thinking accordions, code drawers.
- **Model Selector**: NVIDIA NIM `meta/muse-glimmer-30b` (default), `llama-3.1-70b-instruct`, `mixtral-8x7b-instruct`.
- **Plotly.js Visualizations**: Zero-lag responsive rendering of charts and distributions.
- **Data Quality & KPI Dashboard**: Complete table overview, completeness scores, null counts, duplicate records.
- **Executive HTML Export**: Direct download of executive reports generated deterministically.

## Development

```bash
# Install dependencies
npm install

# Run dev server with hot module reloading
npm run dev

# Build for production
npm run build
```

API calls to `/api/*` are automatically proxied to `http://localhost:8000` via `vite.config.js`.

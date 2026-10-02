# AI-Powered Data Analyst

A production-grade, conversational Data Analyst platform that enables users to upload single or multiple CSV files, ask questions in natural language, detect anomalies, view interactive visualizations, and inspect deterministic data insights.

Built for the **Digital Back Office Software Engineer Intern Assignment**.

---

## 🌟 Key Features

1. **Multi-File CSV Upload & Schema Validation**:
   - Supports uploading multiple CSV files simultaneously.
   - Automatically profiles columns, null percentages, distinct counts, and data distributions.
   - Computes an end-to-end **Data Quality Score** with structural sanity checks.

2. **Conversational Natural Language Interface**:
   - Answer analytical questions without inventing or hallucinating numbers.
   - Maintains multi-turn conversational session context.

3. **Deterministic Tool Calling & Orchestration**:
   - Implements a strict **7-step analytical lifecycle**:
     1. Parse user question & conversation context
     2. Inspect dataset catalog schema & column statistics
     3. Formulate structured analytical plan (`QueryPlan` via Pydantic schema)
     4. Call deterministic analytical tool (`DuckDB`, `Pandas`, `Plotly`)
     5. Receive verified computational results
     6. Validate results integrity
     7. Synthesize transparent natural-language explanation with business takeaways

4. **Safe SQL Analytics (DuckDB)**:
   - Registers all uploaded CSVs as in-memory DuckDB tables.
   - Enforces read-only safety validation to block `DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, etc.
   - Enables multi-table joins (e.g. joining sales with customer tables).

5. **Statistical Anomaly Detection**:
   - **Interquartile Range (IQR)**: Tukey's Fences method ($Q_1 - 1.5 \times \text{IQR}$, $Q_3 + 1.5 \times \text{IQR}$).
   - **Z-Score Method**: Standard score threshold detection ($|Z| > 3.0$).
   - Provides exact mathematical bounds, baseline values, and contextual explanations.

6. **Interactive Visualizations (Plotly)**:
   - Dynamic bar, line, pie/donut, scatter, histogram, and box plots.
   - Styled with modern dark theme and responsive layout.

7. **Explainability & Code Generation**:
   - Provides step-by-step execution traces explaining how every answer was obtained.
   - Displays generated DuckDB SQL and equivalent Pandas code for auditing and transparency.
   - **No unrestricted `exec()`**: User data and host environment remain completely secure.

8. **Offline / Out-of-the-Box Heuristic Fallback**:
   - Runs seamlessly even without an external paid API key using built-in deterministic heuristic planning.
   - Fully compatible with OpenAI, Gemini (via OpenAI compatibility endpoint), Groq, and Ollama.

---

## 🏗️ Architecture & Component Separation

```mermaid
flowchart TD
    User([User / Browser]) <--> UI[Streamlit UI Layer\napp.py]
    
    subgraph UI & State
        UI <--> State[SessionState\nsrc/agent/state.py]
        State --> Catalog[(DuckDB In-Memory\n& Pandas DataFrames)]
    end

    subgraph Agent Layer
        UI --> Agent[DataAnalystAgent\nsrc/agent/analyst.py]
        Agent <--> Prompts[Prompts Engine\nsrc/agent/prompts.py]
        Agent <--> LLM[LLM Service\nsrc/services/llm.py]
    end

    subgraph Deterministic Tools Layer
        Agent --> Registry[Tool Registry\nsrc/tools/registry.py]
        Registry --> SQLTool[DuckDB SQL Tool\nsrc/tools/sql.py]
        Registry --> AnomalyTool[Anomaly Detection\nsrc/tools/anomalies.py]
        Registry --> AnalysisTool[Analytics & Aggregation\nsrc/tools/analysis.py]
        Registry --> ChartTool[Plotly Chart Engine\nsrc/tools/charts.py]
        Registry --> QualityTool[Quality & Profiling\nsrc/tools/profiling.py]
    end

    Catalog <--> SQLTool
    Catalog <--> AnomalyTool
    Catalog <--> AnalysisTool
    Catalog <--> ChartTool
    Catalog <--> QualityTool
```

### Strict Layer Decoupling:
- **UI (`app.py`)**: Responsible only for user input rendering, layout, and visualization display. Zero business logic.
- **Agent (`src/agent/`)**: Orchestrates the 7-step analytical lifecycle. Manages context, prompts, and tool dispatching.
- **Tools (`src/tools/`)**: Isolated deterministic calculation engines with strict typed contracts.
- **Services (`src/services/`)**: LLM transport and JSON schema enforcement.
- **Models (`src/models/`)**: Pydantic v2 schemas for all inputs, plans, and outputs.
- **Utils (`src/utils/`)**: Structured logging and configuration.## 📁 Project Directory Structure

```text
ai-data-analyst/
├── backend/                    # High-Performance Python Analytics Backend
│   ├── src/
│   │   ├── agent/              # 7-step DataAnalystAgent orchestrator & session state
│   │   ├── tools/              # Deterministic DuckDB, IQR/Z-score, charts & profiling
│   │   ├── services/           # NVIDIA NIM (muse-glimmer) & LLM integration
│   │   ├── models/             # Pydantic v2 schemas & typed contracts
│   │   └── utils/              # Structured logging and evaluation benchmarks
│   ├── data/samples/           # Sample CSVs (sales_data.csv, customers.csv)
│   ├── tests/                  # 23 comprehensive unit & evaluation tests
│   ├── server.py               # FastAPI analytical REST server
│   ├── run.py                  # Unified launcher
│   ├── pyproject.toml          # uv package dependencies
│   ├── uv.lock                 # Deterministic dependency lockfile
│   ├── .env.example            # Environment variables configuration
│   └── Dockerfile              # Multi-stage production container build
├── frontend/                   # Modern React.js Client (ChatGPT / Gemini style)
│   ├── src/
│   │   ├── components/         # ChatArea, Sidebar, DashboardView, ChartRenderer
│   │   ├── App.jsx             # Main application shell
│   │   └── index.css           # Curated dark mode & typography styling
│   ├── public/                 # Static brand assets
│   ├── package.json            # Node.js dependencies
│   └── vite.config.js          # Vite config with /api proxy to FastAPI
├── docs/                       # Architecture diagrams & specifications
├── docker-compose.yml          # Container orchestration configuration
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started with React & uv

The project is neatly divided into two dedicated folders:
- **`backend/`**: FastAPI, DuckDB, Pandas, NVIDIA NIM (`muse-glimmer`), and Pytest test suite managed via **`uv`**.
- **`frontend/`**: Vite + React.js SPA featuring Gemini/ChatGPT aesthetics, Plotly chart visualizer, and dynamic model selector.

### Prerequisites
- [uv](https://docs.astral.sh/uv/getting-started/installation/) installed
- Node.js 18+ & npm
- Docker (optional, for containerized run)

### Running the Application

1. **Setup & Run Backend:**
   ```bash
   cd backend
   uv sync
   uv run python run.py
   ```
   *Note: `run.py` automatically checks and builds the frontend if needed and serves everything on `http://localhost:8000`.*

---

### Development Mode (Independent Hot Reloading)

If you are developing and want instant hot module reloading:

- **Terminal 1 (Backend API):**
  ```bash
  cd backend
  uv run uvicorn server:app --port 8000 --reload
  ```
- **Terminal 2 (React Vite Frontend):**
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
  Open **`http://localhost:5173`** (API requests are automatically proxied to port 8000).

---

## 🧪 Running Tests with uv

From the `backend/` directory:

```bash
cd backend
uv run pytest tests/ -v
```

---

## 🧪 Running Tests with uv

From the `backend/` directory:

```bash
cd backend
uv run pytest tests/ -v
```

---

## 🐳 Docker Deployment

Run the complete multi-stage container (builds React + serves FastAPI):

```bash
docker compose up --build
```
The app will be available immediately at **`http://localhost:8000`**.

---

## 💡 Example Analytical Queries

Try these questions using the pre-loaded sample datasets:

| Analysis Type | Example Question | Tool Executed |
|---|---|---|
| **Ranking** | *"Which region generated the highest revenue?"* | `top_k_analysis` |
| **Outliers** | *"Detect anomalies in revenue and explain why they were flagged."* | `detect_anomalies` (IQR) |
| **Trends** | *"Show the monthly sales trend."* | `time_series_trend` / `generate_chart` |
| **Performance**| *"Which products are underperforming?"* | `top_k_analysis` (ascending) |
| **SQL** | *"Generate SQL for sales by region."* | `execute_sql_query` |
| **Visualizations**| *"Generate a bar chart of profit by region."* | `generate_chart` |
| **Data Quality** | *"Run a data quality audit on the active dataset."* | `check_data_quality` |

---

## 🛡️ Security & Design Assumptions

1. **Deterministic Grounding**: The LLM is never permitted to produce numerical outputs unassisted. All numbers shown in answers originate directly from verified tool outputs.
2. **Code Execution Safety**: Generated Pandas or SQL code is shown for developer transparency and auditing; arbitrary user or LLM code is **never passed to `exec()` or `eval()`**.
3. **DuckDB Isolation**: In-memory DuckDB connections run with read-only validation against destructive keywords (`DROP`, `DELETE`, `ALTER`, `ATTACH`).
4. **Resilience**: The system gracefully falls back to statistical summaries if an external LLM request times out.

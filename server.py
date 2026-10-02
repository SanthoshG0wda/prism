"""
FastAPI Backend for AI Data Analyst.
Serves analytical APIs, file ingestion, deterministic orchestration, and report generation
to the React.js client interface.
"""

import io
import os
from typing import Any, Dict, List, Optional
import duckdb
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import pandas as pd
from pydantic import BaseModel, Field

from src.agent.analyst import DataAnalystAgent
from src.agent.state import SessionState
from src.models.schemas import AgentResponse
from src.services.llm import LLMService, LLMSettings
from src.tools.export import generate_executive_html_report
from src.tools.profiling import check_data_quality
from src.utils.logging import get_logger, setup_logging

setup_logging()
logger = get_logger("api.server")

app = FastAPI(
    title="AI Data Analyst API",
    description="Deterministic Data Analysis backend powered by NVIDIA NIM & DuckDB",
    version="1.0.0",
)

# Enable CORS for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global session state singleton for the local single-user analyst instance
session_state = SessionState()


def auto_load_samples():
    """Auto-load default sample datasets if empty."""
    sample_sales = "data/samples/sales_data.csv"
    sample_cust = "data/samples/customers.csv"
    if os.path.exists(sample_sales):
        df_sales = pd.read_csv(sample_sales)
        session_state.register_dataset("sales_data", df_sales)
    if os.path.exists(sample_cust):
        df_cust = pd.read_csv(sample_cust)
        session_state.register_dataset("customers", df_cust)
    logger.info("Initialized default sample datasets.")


auto_load_samples()


class ChatRequest(BaseModel):
    query: str
    provider: str = "nvidia"
    api_key: Optional[str] = None
    model: str = "meta/llama-3.3-70b-instruct"
    base_url: str = "https://integrate.api.nvidia.com/v1"


class DatasetSelectRequest(BaseModel):
    dataset_name: str


@app.get("/api/health")
def health_check():
    return {"status": "ok", "provider": "nvidia-nim", "tables_loaded": len(session_state.datasets)}


@app.get("/api/catalog")
def get_catalog():
    """Returns metadata for all registered tables."""
    tables = []
    for name, meta in session_state.metadata_cache.items():
        tables.append({
            "name": name,
            "row_count": meta.row_count,
            "column_count": meta.column_count,
            "memory_bytes": meta.memory_bytes,
            "columns": [c.model_dump() for c in meta.columns],
            "is_active": name == session_state.active_dataset_name,
        })
    return {
        "active_dataset": session_state.active_dataset_name,
        "tables": tables,
    }


@app.post("/api/load-samples")
def load_sample_datasets():
    """Reloads sample sales and customers datasets."""
    auto_load_samples()
    return {"message": "Sample datasets loaded successfully", "active": session_state.active_dataset_name}


@app.post("/api/select-dataset")
def select_dataset(req: DatasetSelectRequest):
    """Sets active dataset in session state."""
    try:
        session_state.set_active_dataset(req.dataset_name)
        return {"status": "success", "active_dataset": session_state.active_dataset_name}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """Uploads one or more CSV files into DuckDB in-memory tables."""
    uploaded_tables = []
    for file in files:
        table_name = file.filename.rsplit(".", 1)[0]
        # sanitize
        clean_name = "".join(c if c.isalnum() else "_" for c in table_name).strip("_").lower()
        contents = await file.read()
        try:
            df = pd.read_csv(io.BytesIO(contents))
            meta = session_state.register_dataset(clean_name, df)
            uploaded_tables.append({
                "table_name": clean_name,
                "rows": meta.row_count,
                "columns": meta.column_count,
            })
        except Exception as err:
            logger.error(f"Failed to read CSV {file.filename}: {err}")
            raise HTTPException(status_code=400, detail=f"Invalid CSV format for {file.filename}: {str(err)}")

    return {"uploaded": uploaded_tables, "active_dataset": session_state.active_dataset_name}


@app.post("/api/chat", response_model=AgentResponse)
def chat_with_agent(req: ChatRequest):
    """Processes a natural language query through the 7-step DataAnalystAgent lifecycle."""
    if not session_state.datasets:
        raise HTTPException(status_code=400, detail="No datasets loaded. Please upload a CSV first.")

    settings = LLMSettings(
        LLM_PROVIDER=req.provider,
        LLM_API_KEY=req.api_key or os.getenv("NVIDIA_API_KEY") or os.getenv("LLM_API_KEY", ""),
        LLM_MODEL=req.model,
        LLM_BASE_URL=req.base_url,
    )
    llm = LLMService(settings=settings)
    agent = DataAnalystAgent(session_state=session_state, llm_service=llm)

    response = agent.run(req.query)
    return response


@app.get("/api/dashboard")
def get_dashboard():
    """Returns KPI cards, charts, and data quality report for the active table."""
    active_df = session_state.get_active_df()
    if active_df is None:
        raise HTTPException(status_code=400, detail="No active dataset.")

    table_name = session_state.active_dataset_name or "active_dataset"
    quality_report = check_data_quality(active_df, table_name)

    numeric_cols = active_df.select_dtypes(include=["number"]).columns.tolist()
    total_rev = float(active_df["revenue"].sum()) if "revenue" in active_df.columns else (float(active_df[numeric_cols[0]].sum()) if numeric_cols else 0.0)
    total_profit = float(active_df["profit"].sum()) if "profit" in active_df.columns else 0.0

    charts = []

    # Chart 1: Regional breakdown or numeric distribution
    if "region" in active_df.columns and "revenue" in active_df.columns:
        grouped = active_df.groupby("region")["revenue"].sum().reset_index()
        charts.append({
            "title": "Revenue by Region",
            "type": "bar",
            "data": grouped.to_dict(orient="records"),
            "x_key": "region",
            "y_key": "revenue",
        })

    # Chart 2: Product share
    if "product" in active_df.columns and "revenue" in active_df.columns:
        grouped_p = active_df.groupby("product")["revenue"].sum().reset_index()
        charts.append({
            "title": "Revenue Share by Product",
            "type": "pie",
            "data": grouped_p.to_dict(orient="records"),
            "x_key": "product",
            "y_key": "revenue",
        })

    return {
        "table_name": table_name,
        "kpis": {
            "total_rows": len(active_df),
            "completeness_score": quality_report.completeness_score,
            "total_revenue": total_rev,
            "total_profit": total_profit,
            "duplicate_rows": quality_report.duplicate_rows,
            "numeric_columns_count": len(numeric_cols),
        },
        "quality_report": quality_report.model_dump(),
        "charts": charts,
    }


@app.get("/api/export-report", response_class=HTMLResponse)
def export_report():
    """Generates the executive HTML summary report."""
    return generate_executive_html_report(session_state)


@app.post("/api/clear-chat")
def clear_chat():
    session_state.clear_history()
    return {"message": "Chat history cleared"}


# Mount React build assets if present
frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dist):
    from fastapi.staticfiles import StaticFiles
    from starlette.responses import FileResponse

    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        target_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(target_path):
            return FileResponse(target_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

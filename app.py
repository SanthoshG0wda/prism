"""
Production-quality AI Data Analyst - Streamlit Application Interface.
Maintains strict decoupling: UI only renders state and delegates all reasoning
and computation to the agent and deterministic tools layer.
"""

import os
from typing import Dict, List, Optional
import pandas as pd
import streamlit as st
import plotly.express as px
from src.agent.analyst import DataAnalystAgent
from src.agent.state import SessionState
from src.models.schemas import AgentResponse
from src.services.llm import LLMService, LLMSettings
from src.tools.export import generate_executive_html_report
from src.tools.profiling import check_data_quality
from src.utils.logging import get_logger, setup_logging

setup_logging()
logger = get_logger("ui.app")

# Page Configuration
st.set_page_config(
    page_title="AI Data Analyst | Digital Back Office",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS styling for premium look & feel
st.markdown(
    """
    <style>
    .main-header {
        font-family: 'Inter', -apple-system, sans-serif;
        font-weight: 700;
        font-size: 2.1rem;
        background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.2rem;
    }
    .sub-header {
        color: #94a3b8;
        font-size: 0.95rem;
        margin-bottom: 1.2rem;
    }
    .card-kpi {
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 16px;
        text-align: center;
    }
    .card-kpi-value {
        font-size: 1.6rem;
        font-weight: bold;
        color: #38bdf8;
    }
    .card-kpi-label {
        font-size: 0.85rem;
        color: #94a3b8;
        margin-top: 4px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


def get_session_state() -> SessionState:
    """Initializes and persists SessionState in Streamlit session."""
    if "data_state" not in st.session_state:
        st.session_state.data_state = SessionState()
    return st.session_state.data_state


def get_agent(state: SessionState, api_key: str = "", model_name: str = "gpt-4o-mini") -> DataAnalystAgent:
    """Instantiates the agent with updated settings."""
    settings = LLMSettings(
        LLM_API_KEY=api_key or os.getenv("LLM_API_KEY", ""),
        LLM_MODEL=model_name or os.getenv("LLM_MODEL", "gpt-4o-mini"),
    )
    llm_service = LLMService(settings=settings)
    return DataAnalystAgent(session_state=state, llm_service=llm_service)


def render_sidebar(state: SessionState) -> tuple[str, str]:
    """Renders the left control panel: uploads, dataset selector, and configuration."""
    with st.sidebar:
        st.title("⚙️ Control Panel")

        # Configuration Section
        with st.expander("🔑 LLM Configuration", expanded=False):
            api_key = st.text_input(
                "API Key (OpenAI / Compatible)",
                type="password",
                value=os.getenv("LLM_API_KEY", ""),
                help="Optional. If omitted, built-in deterministic heuristic orchestrator will be used.",
            )
            model_name = st.selectbox(
                "Model",
                ["gpt-4o-mini", "gpt-4o", "gemini-1.5-pro", "gemini-1.5-flash", "local-ollama"],
                index=0,
            )

        st.markdown("---")
        st.subheader("📂 Upload Datasets")
        uploaded_files = st.file_uploader(
            "Upload one or more CSV files",
            type=["csv"],
            accept_multiple_files=True,
            help="Files will be indexed and registered as queryable SQL tables in DuckDB.",
        )

        # Load samples button for instant testing
        if st.button("📥 Load Sample Datasets (Sales & Customers)", use_container_width=True):
            sample_sales = "data/samples/sales_data.csv"
            sample_cust = "data/samples/customers.csv"
            if os.path.exists(sample_sales):
                df_sales = pd.read_csv(sample_sales)
                state.register_dataset("sales_data", df_sales)
            if os.path.exists(sample_cust):
                df_cust = pd.read_csv(sample_cust)
                state.register_dataset("customers", df_cust)
            st.success("Loaded sample datasets: 'sales_data' & 'customers'!")
            st.rerun()

        # Process uploaded files
        if uploaded_files:
            for file in uploaded_files:
                table_name = file.name.rsplit(".", 1)[0]
                if table_name not in state.datasets:
                    try:
                        df = pd.read_csv(file)
                        state.register_dataset(table_name, df)
                        st.success(f"Registered table `{table_name}` ({len(df)} rows)")
                    except Exception as err:
                        st.error(f"Failed to load {file.name}: {err}")

        # Active Dataset Selector
        st.markdown("---")
        st.subheader("🗃️ Active Table Catalog")
        if state.datasets:
            dataset_options = list(state.datasets.keys())
            current_index = (
                dataset_options.index(state.active_dataset_name)
                if state.active_dataset_name in dataset_options
                else 0
            )
            chosen_dataset = st.selectbox(
                "Selected Table for Analysis:",
                dataset_options,
                index=current_index,
            )
            if chosen_dataset != state.active_dataset_name:
                state.set_active_dataset(chosen_dataset)
                st.rerun()

            meta = state.metadata_cache.get(chosen_dataset)
            if meta:
                st.caption(f"📊 **Rows:** {meta.row_count:,} | **Cols:** {meta.column_count}")
                st.caption(f"💾 **Memory:** {meta.memory_bytes / 1024:.1f} KB")

                with st.expander("📋 Schema Details", expanded=False):
                    schema_df = pd.DataFrame([
                        {
                            "Column": c.name,
                            "Type": c.dtype,
                            "Nulls": f"{c.null_count} ({c.null_percentage}%)",
                            "Distinct": c.distinct_count,
                        }
                        for c in meta.columns
                    ])
                    st.dataframe(schema_df, hide_index=True, use_container_width=True)

            # Export Report Button
            st.markdown("---")
            report_html = generate_executive_html_report(state)
            st.download_button(
                label="📄 Export Executive Report (HTML)",
                data=report_html,
                file_name=f"analyst_report_{chosen_dataset}.html",
                mime="text/html",
                use_container_width=True,
            )
        else:
            st.info("No CSV datasets loaded yet.")

        # Quick reset
        st.markdown("---")
        if st.button("🧹 Clear Chat History", use_container_width=True):
            state.clear_history()
            st.rerun()

    return api_key, model_name


def render_response(resp: AgentResponse) -> None:
    """Renders agent output with transparent reasoning, charts, tables, and code."""
    st.markdown(resp.answer)

    # Visualization
    if resp.chart_spec:
        st.plotly_chart(resp.chart_spec, use_container_width=True)

    # Anomaly breakdown
    if resp.anomalies:
        st.subheader("🚨 Detected Outliers & Anomalies")
        anom_rows = [
            {
                "Row #": a.row_index,
                "Column": a.column,
                "Value": f"{a.value:,.2f}" if isinstance(a.value, (int, float)) else a.value,
                "Method": a.method.upper(),
                "Deviation / Score": a.score,
                "Mathematical Explanation": a.explanation,
            }
            for a in resp.anomalies
        ]
        st.dataframe(pd.DataFrame(anom_rows), use_container_width=True, hide_index=True)

    # Tabular result view
    if isinstance(resp.tool_result, dict) and "records" in resp.tool_result:
        records = resp.tool_result["records"]
        if records:
            with st.expander("📑 View Tabular Data Result", expanded=False):
                st.dataframe(pd.DataFrame(records), use_container_width=True)

    # Code Drawers
    col1, col2 = st.columns(2)
    with col1:
        if resp.generated_sql:
            with st.expander("🔍 Generated DuckDB SQL", expanded=False):
                st.code(resp.generated_sql, language="sql")
    with col2:
        if resp.generated_pandas_code:
            with st.expander("🐍 Equivalent Pandas Code", expanded=False):
                st.code(resp.generated_pandas_code, language="python")

    # Transparent 7-Step Analytical Execution Log
    if resp.steps_explanation:
        with st.expander("⚙️ Execution Trace & Methodology (Step-by-Step)", expanded=False):
            for step in resp.steps_explanation:
                st.text(step)
            st.caption(f"⚡ Total Execution Time: {resp.execution_time_ms:.1f}ms | Tool: `{resp.tool_used}`")


def render_dashboard_tab(state: SessionState) -> None:
    """Renders the executive dashboard and data quality audit view."""
    active_df = state.get_active_df()
    if active_df is None:
        st.info("Please upload a dataset to view the Executive Dashboard.")
        return

    table_name = state.active_dataset_name or "Dataset"
    report = check_data_quality(active_df, table_name)

    # KPI Summary Cards
    st.subheader(f"📈 Executive Overview: `{table_name}`")
    col1, col2, col3, col4 = st.columns(4)

    numeric_cols = active_df.select_dtypes(include=["number"]).columns.tolist()
    total_rev = active_df["revenue"].sum() if "revenue" in active_df.columns else (active_df[numeric_cols[0]].sum() if numeric_cols else 0)
    total_profit = active_df["profit"].sum() if "profit" in active_df.columns else 0

    col1.metric("Total Records", f"{len(active_df):,}")
    col2.metric("Data Completeness", f"{report.completeness_score}%")
    if total_rev > 0:
        col3.metric("Total Revenue", f"${total_rev:,.2f}")
    else:
        col3.metric("Numeric Columns", len(numeric_cols))
    if total_profit > 0:
        col4.metric("Total Profit", f"${total_profit:,.2f}")
    else:
        col4.metric("Duplicate Rows", report.duplicate_rows)

    st.markdown("---")

    # Visual Insights Row
    c1, c2 = st.columns(2)
    with c1:
        if "region" in active_df.columns and "revenue" in active_df.columns:
            region_sum = active_df.groupby("region")["revenue"].sum().reset_index()
            fig_bar = px.bar(
                region_sum,
                x="region",
                y="revenue",
                title="Revenue by Region",
                color="region",
                template="plotly_dark",
            )
            st.plotly_chart(fig_bar, use_container_width=True)
        elif len(numeric_cols) >= 1:
            fig_hist = px.histogram(
                active_df,
                x=numeric_cols[0],
                title=f"Distribution of {numeric_cols[0]}",
                template="plotly_dark",
            )
            st.plotly_chart(fig_hist, use_container_width=True)

    with c2:
        if "product" in active_df.columns and "revenue" in active_df.columns:
            prod_sum = active_df.groupby("product")["revenue"].sum().reset_index()
            fig_pie = px.pie(
                prod_sum,
                names="product",
                values="revenue",
                title="Revenue Share by Product",
                template="plotly_dark",
                hole=0.4,
            )
            st.plotly_chart(fig_pie, use_container_width=True)
        elif len(numeric_cols) >= 2:
            fig_scat = px.scatter(
                active_df,
                x=numeric_cols[0],
                y=numeric_cols[1],
                title=f"{numeric_cols[0]} vs {numeric_cols[1]}",
                template="plotly_dark",
            )
            st.plotly_chart(fig_scat, use_container_width=True)

    # Data Quality Audit Section
    st.subheader("🛡️ Data Quality & Hygiene Audit")
    qcol1, qcol2 = st.columns([1, 2])
    with qcol1:
        st.markdown(f"**Completeness Score:** `{report.completeness_score}%`")
        st.markdown(f"**Missing Cells:** `{report.missing_cells}`")
        st.markdown(f"**Duplicate Rows:** `{report.duplicate_rows}`")
    with qcol2:
        st.markdown("**Quality Findings & Warnings:**")
        for issue in report.quality_issues:
            st.info(f"• {issue}")


def main() -> None:
    """Main Streamlit application entrypoint."""
    st.markdown('<div class="main-header">AI-Powered Data Analyst</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="sub-header">Production-grade deterministic analytics, explainable reasoning, and interactive visualizations.</div>',
        unsafe_allow_html=True,
    )

    state = get_session_state()
    api_key, model_name = render_sidebar(state)
    agent = get_agent(state, api_key=api_key, model_name=model_name)

    if not state.datasets:
        st.warning("👈 Please upload one or more CSV files or click **'Load Sample Datasets'** in the sidebar to begin.")
        return

    # Two main view tabs
    tab_chat, tab_dashboard = st.tabs(["💬 Conversational Analyst", "📊 Executive Dashboard & Quality Audit"])

    with tab_dashboard:
        render_dashboard_tab(state)

    with tab_chat:
        # Quick Question Buttons
        st.markdown("##### 💡 Example Questions")
        q1, q2, q3, q4, q5 = st.columns(5)
        quick_query = None
        if q1.button("🏆 Top Customers", use_container_width=True):
            quick_query = "What are the top 5 customers by revenue?"
        if q2.button("📈 Monthly Trends", use_container_width=True):
            quick_query = "Show the monthly sales trend."
        if q3.button("🚨 Detect Anomalies", use_container_width=True):
            quick_query = "Detect anomalies in revenue and explain why they were flagged."
        if q4.button("🔮 Forecast Sales", use_container_width=True):
            quick_query = "Forecast revenue for next 3 months with confidence intervals."
        if q5.button("📉 Low Products", use_container_width=True):
            quick_query = "Which products are underperforming?"

        # Chat history display
        for msg in state.conversation_history:
            with st.chat_message(msg.role):
                st.markdown(msg.content)

        # Chat Input Box
        user_prompt = st.chat_input("Ask a question about your data (e.g., 'Which region generated the highest revenue?')...")
        query_to_run = quick_query or user_prompt

        if query_to_run:
            with st.chat_message("user"):
                st.markdown(query_to_run)

            with st.chat_message("assistant"):
                with st.spinner("Executing deterministic analysis..."):
                    response = agent.run(query_to_run)
                    render_response(response)


if __name__ == "__main__":
    main()

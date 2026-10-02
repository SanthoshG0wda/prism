"""
Production-quality AI Data Analyst - Gemini & ChatGPT Inspired Streamlit Interface.
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
    page_icon="✨",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS styling for authentic Gemini / ChatGPT look & feel
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

    /* Global Theme */
    html, body, [class*="st-"] {
        font-family: 'Google Sans', 'Inter', -apple-system, sans-serif;
    }

    .stApp {
        background-color: #131314;
        color: #e3e3e3;
    }

    /* Top Bar & Header */
    header[data-testid="stHeader"] {
        background: transparent !important;
    }

    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: #1e1f20 !important;
        border-right: 1px solid #2d2f31 !important;
    }
    section[data-testid="stSidebar"] hr {
        border-color: #2d2f31 !important;
    }

    /* Gemini Model Badge */
    .model-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #1e1f20;
        border: 1px solid #3c4043;
        color: #c4c7c5;
        padding: 5px 14px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 500;
        margin-bottom: 12px;
    }

    /* Gemini Hero Greeting */
    .gemini-hero-title {
        font-size: 2.8rem;
        font-weight: 600;
        background: linear-gradient(74deg, #4285f4 0%, #9b72cb 15%, #d96570 30%, #d96570 40%, #9b72cb 60%, #4285f4 85%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        line-height: 1.25;
        margin-top: 15px;
        margin-bottom: 6px;
    }
    .gemini-hero-subtitle {
        font-size: 1.6rem;
        font-weight: 500;
        color: #5f6368;
        margin-bottom: 28px;
    }

    /* Starter Prompt Cards */
    .starter-card-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-bottom: 25px;
    }
    div[data-testid="stButton"] > button {
        border-radius: 12px !important;
        border: 1px solid #3c4043 !important;
        background-color: #1e1f20 !important;
        color: #e3e3e3 !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        font-weight: 500 !important;
    }
    div[data-testid="stButton"] > button:hover {
        background-color: #282a2c !important;
        border-color: #8ab4f8 !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
    }

    /* Chat Messages Styling */
    div[data-testid="stChatMessage"] {
        background-color: transparent !important;
        border: none !important;
        padding: 12px 0 !important;
    }

    /* Chat Input Bar (Gemini / ChatGPT pill) */
    div[data-testid="stChatInput"] {
        border-radius: 28px !important;
        border: 1px solid #3c4043 !important;
        background-color: #1e1f20 !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35) !important;
        transition: all 0.2s ease !important;
        padding: 4px 8px !important;
    }
    div[data-testid="stChatInput"]:focus-within {
        border-color: #8ab4f8 !important;
        box-shadow: 0 4px 20px rgba(66, 133, 244, 0.25) !important;
    }
    div[data-testid="stChatInput"] textarea {
        color: #f1f3f4 !important;
        font-size: 0.95rem !important;
    }

    /* Expander / Thought Process */
    div[data-testid="stExpander"] {
        background-color: #1b1c1d !important;
        border: 1px solid #2d2f31 !important;
        border-radius: 12px !important;
        margin-bottom: 12px !important;
    }
    div[data-testid="stExpander"] summary {
        color: #9aa0a6 !important;
        font-weight: 500 !important;
        font-size: 0.88rem !important;
    }

    /* Tabs Styling */
    div[data-testid="stTabs"] button[role="tab"] {
        color: #9aa0a6 !important;
        font-size: 0.95rem !important;
        font-weight: 500 !important;
        padding: 8px 18px !important;
        border-radius: 20px !important;
        margin-right: 8px !important;
    }
    div[data-testid="stTabs"] button[role="tab"][aria-selected="true"] {
        color: #8ab4f8 !important;
        background-color: #1e1f20 !important;
        border: 1px solid #3c4043 !important;
    }

    /* Metric Cards */
    div[data-testid="stMetric"] {
        background-color: #1e1f20 !important;
        border: 1px solid #2d2f31 !important;
        border-radius: 14px !important;
        padding: 14px 18px !important;
    }
    div[data-testid="stMetricLabel"] {
        color: #9aa0a6 !important;
        font-size: 0.85rem !important;
    }
    div[data-testid="stMetricValue"] {
        color: #8ab4f8 !important;
        font-weight: 600 !important;
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


def get_agent(
    state: SessionState,
    provider: str = "nvidia",
    api_key: str = "",
    model_name: str = "meta/llama-3.3-70b-instruct",
    base_url: str = "https://integrate.api.nvidia.com/v1",
) -> DataAnalystAgent:
    """Instantiates the agent with updated settings."""
    settings = LLMSettings(
        LLM_PROVIDER=provider,
        LLM_API_KEY=api_key or os.getenv("NVIDIA_API_KEY") or os.getenv("LLM_API_KEY", ""),
        LLM_MODEL=model_name,
        LLM_BASE_URL=base_url,
    )
    llm_service = LLMService(settings=settings)
    return DataAnalystAgent(session_state=state, llm_service=llm_service)


def render_sidebar(state: SessionState) -> tuple[str, str, str, str]:
    """Renders the left control panel: uploads, dataset selector, and configuration."""
    with st.sidebar:
        st.markdown("### ✨ Digital Back Office")
        st.markdown(
            '<div class="model-badge">⚡ Powered by NVIDIA NIM</div>',
            unsafe_allow_html=True,
        )

        # Configuration Section
        with st.expander("⚙️ AI Provider & Model", expanded=False):
            provider_choice = st.selectbox(
                "Provider",
                ["NVIDIA NIM", "OpenAI / Compatible", "Local (Ollama)"],
                index=0,
            )

            if provider_choice == "NVIDIA NIM":
                provider_key = "nvidia"
                base_url = "https://integrate.api.nvidia.com/v1"
                model_options = [
                    "meta/llama-3.3-70b-instruct",
                    "nvidia/llama-3.1-nemotron-70b-instruct",
                    "meta/llama-3.1-70b-instruct",
                    "meta/llama-3.1-8b-instruct",
                    "mistralai/mistral-large-2-instruct",
                ]
                key_placeholder = "nvapi-..."
                key_help = "Get a free key from build.nvidia.com"
                env_key = os.getenv("NVIDIA_API_KEY") or os.getenv("LLM_API_KEY", "")
            elif provider_choice == "OpenAI / Compatible":
                provider_key = "openai"
                base_url = "https://api.openai.com/v1"
                model_options = ["gpt-4o-mini", "gpt-4o"]
                key_placeholder = "sk-..."
                key_help = "OpenAI API key"
                env_key = os.getenv("LLM_API_KEY", "")
            else:
                provider_key = "ollama"
                base_url = "http://localhost:11434/v1"
                model_options = ["llama3.1", "mistral", "qwen2.5"]
                key_placeholder = "ollama"
                key_help = "Local Ollama server"
                env_key = "ollama"

            api_key = st.text_input(
                f"{provider_choice} Key",
                type="password",
                value=env_key,
                placeholder=key_placeholder,
                help=key_help,
            )
            model_name = st.selectbox("Model", model_options, index=0)

        st.markdown("---")
        st.subheader("📂 Datasets")
        uploaded_files = st.file_uploader(
            "Upload CSV files",
            type=["csv"],
            accept_multiple_files=True,
            help="Files will be indexed as SQL tables in DuckDB.",
        )

        # Load samples button
        if st.button("📥 Load Sample Datasets", use_container_width=True):
            sample_sales = "data/samples/sales_data.csv"
            sample_cust = "data/samples/customers.csv"
            if os.path.exists(sample_sales):
                df_sales = pd.read_csv(sample_sales)
                state.register_dataset("sales_data", df_sales)
            if os.path.exists(sample_cust):
                df_cust = pd.read_csv(sample_cust)
                state.register_dataset("customers", df_cust)
            st.success("Loaded 'sales_data' & 'customers'!")
            st.rerun()

        # Process uploaded files
        if uploaded_files:
            for file in uploaded_files:
                table_name = file.name.rsplit(".", 1)[0]
                if table_name not in state.datasets:
                    try:
                        df = pd.read_csv(file)
                        state.register_dataset(table_name, df)
                        st.success(f"Registered `{table_name}` ({len(df)} rows)")
                    except Exception as err:
                        st.error(f"Failed to load {file.name}: {err}")

        # Active Dataset Selector
        st.markdown("---")
        st.subheader("🗃️ Active Table")
        if state.datasets:
            dataset_options = list(state.datasets.keys())
            current_index = (
                dataset_options.index(state.active_dataset_name)
                if state.active_dataset_name in dataset_options
                else 0
            )
            chosen_dataset = st.selectbox(
                "Active Dataset:",
                dataset_options,
                index=current_index,
            )
            if chosen_dataset != state.active_dataset_name:
                state.set_active_dataset(chosen_dataset)
                st.rerun()

            meta = state.metadata_cache.get(chosen_dataset)
            if meta:
                st.caption(f"📊 **Rows:** {meta.row_count:,} | **Cols:** {meta.column_count}")

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
                label="📄 Export Report (HTML)",
                data=report_html,
                file_name=f"analyst_report_{chosen_dataset}.html",
                mime="text/html",
                use_container_width=True,
            )
        else:
            st.info("No datasets loaded yet.")

        # Quick reset
        st.markdown("---")
        if st.button("🧹 Clear Chat", use_container_width=True):
            state.clear_history()
            st.rerun()

    return provider_key, api_key, model_name, base_url


def render_response(resp: AgentResponse) -> None:
    """Renders agent output with Gemini-style thinking disclosure, visualizations, and code."""
    # 1. Gemini / OpenAI o1 Thinking Process Accordion
    if resp.steps_explanation:
        with st.expander(f"✨ Thinking Process ({len(resp.steps_explanation)} steps • {resp.execution_time_ms:.1f}ms)", expanded=False):
            for step in resp.steps_explanation:
                st.markdown(f"- `{step}`")
            if resp.tool_used:
                st.caption(f"🔧 Deterministic Engine: `{resp.tool_used}`")

    # 2. Main Narrative Answer
    st.markdown(resp.answer)

    # 3. Interactive Plotly Visualization
    if resp.chart_spec:
        st.plotly_chart(resp.chart_spec, use_container_width=True)

    # 4. Anomaly Table
    if resp.anomalies:
        st.markdown("##### 🚨 Flagged Statistical Outliers")
        anom_rows = [
            {
                "Row #": a.row_index,
                "Column": a.column,
                "Value": f"{a.value:,.2f}" if isinstance(a.value, (int, float)) else a.value,
                "Method": a.method.upper(),
                "Score": a.score,
                "Explanation": a.explanation,
            }
            for a in resp.anomalies
        ]
        st.dataframe(pd.DataFrame(anom_rows), use_container_width=True, hide_index=True)

    # 5. Tabular Data Result
    if isinstance(resp.tool_result, dict) and "records" in resp.tool_result:
        records = resp.tool_result["records"]
        if records:
            with st.expander("📑 View Tabular Data", expanded=False):
                st.dataframe(pd.DataFrame(records), use_container_width=True)

    # 6. Generated SQL & Pandas Code Drawers
    if resp.generated_sql or resp.generated_pandas_code:
        col1, col2 = st.columns(2)
        with col1:
            if resp.generated_sql:
                with st.expander("🔍 Generated DuckDB SQL", expanded=False):
                    st.code(resp.generated_sql, language="sql")
        with col2:
            if resp.generated_pandas_code:
                with st.expander("🐍 Generated Pandas Code", expanded=False):
                    st.code(resp.generated_pandas_code, language="python")


def render_dashboard_tab(state: SessionState) -> None:
    """Renders the executive dashboard and data quality audit view."""
    active_df = state.get_active_df()
    if active_df is None:
        st.info("Please upload a dataset to view the Executive Dashboard.")
        return

    table_name = state.active_dataset_name or "Dataset"
    report = check_data_quality(active_df, table_name)

    st.subheader(f"📊 Dashboard: `{table_name}`")
    col1, col2, col3, col4 = st.columns(4)

    numeric_cols = active_df.select_dtypes(include=["number"]).columns.tolist()
    total_rev = active_df["revenue"].sum() if "revenue" in active_df.columns else (active_df[numeric_cols[0]].sum() if numeric_cols else 0)
    total_profit = active_df["profit"].sum() if "profit" in active_df.columns else 0

    col1.metric("Total Rows", f"{len(active_df):,}")
    col2.metric("Completeness", f"{report.completeness_score}%")
    if total_rev > 0:
        col3.metric("Total Revenue", f"${total_rev:,.2f}")
    else:
        col3.metric("Numeric Cols", len(numeric_cols))
    if total_profit > 0:
        col4.metric("Total Profit", f"${total_profit:,.2f}")
    else:
        col4.metric("Duplicates", report.duplicate_rows)

    st.markdown("---")

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

    st.subheader("🛡️ Data Quality & Hygiene")
    qcol1, qcol2 = st.columns([1, 2])
    with qcol1:
        st.markdown(f"**Completeness Score:** `{report.completeness_score}%`")
        st.markdown(f"**Missing Cells:** `{report.missing_cells}`")
        st.markdown(f"**Duplicate Rows:** `{report.duplicate_rows}`")
    with qcol2:
        st.markdown("**Quality Findings & Health Checks:**")
        for issue in report.quality_issues:
            st.info(f"• {issue}")


def main() -> None:
    """Main Streamlit application entrypoint."""
    state = get_session_state()
    provider_key, api_key, model_name, base_url = render_sidebar(state)
    agent = get_agent(
        state,
        provider=provider_key,
        api_key=api_key,
        model_name=model_name,
        base_url=base_url,
    )

    # Empty State - prompt upload
    if not state.datasets:
        st.markdown('<div class="gemini-hero-title">Hello, Analyst</div>', unsafe_allow_html=True)
        st.markdown(
            '<div class="gemini-hero-subtitle">Upload your CSV datasets or load samples from the sidebar to begin.</div>',
            unsafe_allow_html=True,
        )
        col1, col2 = st.columns(2)
        with col1:
            st.info("💡 **Getting Started:** Click **'📥 Load Sample Datasets'** in the sidebar for ready-to-test Sales & Customer tables.")
        with col2:
            st.info("⚡ **AI Orchestration:** Running on **NVIDIA NIM** (`meta/llama-3.3-70b-instruct`) with zero numerical hallucination.")
        return

    # Two Main View Tabs
    tab_chat, tab_dashboard = st.tabs(["💬 Chat", "📊 Executive Dashboard"])

    with tab_dashboard:
        render_dashboard_tab(state)

    with tab_chat:
        # Gemini / ChatGPT Hero Greeting & Suggestion Cards when conversation is fresh
        starter_choice = None
        if not state.conversation_history:
            st.markdown(
                '<div class="gemini-hero-title">Hello, Analyst</div>',
                unsafe_allow_html=True,
            )
            st.markdown(
                f'<div class="gemini-hero-subtitle">How can I help you explore <code>{state.active_dataset_name}</code> today?</div>',
                unsafe_allow_html=True,
            )

            # 4 Prompt Starter Cards in Grid
            c1, c2 = st.columns(2)
            c3, c4 = st.columns(2)
            if c1.button("🏆 Top 5 Customers by Revenue\n\nRank top accounts by total revenue", use_container_width=True):
                starter_choice = "What are the top 5 customers by revenue?"
            if c2.button("📈 Monthly Sales Trend\n\nResample and plot monthly trendline", use_container_width=True):
                starter_choice = "Show the monthly sales trend chart."
            if c3.button("🚨 Detect Statistical Outliers\n\nScan revenue anomalies using Tukey's fences", use_container_width=True):
                starter_choice = "Detect anomalies in revenue and explain why they were flagged."
            if c4.button("🔮 3-Month Predictive Forecast\n\nProject future sales with 95% confidence intervals", use_container_width=True):
                starter_choice = "Forecast revenue for next 3 months with confidence intervals."

        # Chat History
        for msg in state.conversation_history:
            avatar = "👤" if msg.role == "user" else "✨"
            with st.chat_message(msg.role, avatar=avatar):
                st.markdown(msg.content)

        # Gemini Capsule Input Box
        user_prompt = st.chat_input("Ask a question about your data or request a visualization...")
        query_to_run = starter_choice or user_prompt

        if query_to_run:
            # Display user message
            with st.chat_message("user", avatar="👤"):
                st.markdown(query_to_run)

            # Execute Agent Workflow
            with st.chat_message("assistant", avatar="✨"):
                with st.spinner("Analyzing with deterministic tools..."):
                    response = agent.run(query_to_run)
                    render_response(response)


if __name__ == "__main__":
    main()

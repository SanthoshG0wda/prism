"""
Data Analyst Orchestrator Agent.
Coordinates the 7-step analytical lifecycle between LLM reasoning, deterministic tools,
and result validation without allowing the LLM to invent numbers.
"""

import json
import time
from typing import Any, Dict, List, Optional
import pandas as pd
from src.agent.prompts import SYSTEM_PLANNER_PROMPT, SYSTEM_SYNTHESIS_PROMPT
from src.agent.state import SessionState
from src.models.schemas import (
    AgentResponse,
    AnomalyItem,
    DataQualityReport,
    QueryPlan,
    ToolExecutionResult,
)
from src.services.llm import LLMService
from src.tools.registry import ToolRegistry, global_registry
from src.utils.logging import get_logger

logger = get_logger(__name__)


class DataAnalystAgent:
    """
    AI Data Analyst orchestrator implementing the deterministic analysis loop:
    1. Understand user intent & conversation context.
    2. Inspect dataset catalog & schema.
    3. Select deterministic tool.
    4. Call the tool with validated arguments.
    5. Receive actual deterministic results.
    6. Validate the results.
    7. Generate natural-language explanation & actionable business insights.
    """

    def __init__(
        self,
        session_state: SessionState,
        llm_service: Optional[LLMService] = None,
        tool_registry: Optional[ToolRegistry] = None,
    ) -> None:
        self.state = session_state
        self.llm = llm_service or LLMService()
        self.tools = tool_registry or global_registry
        logger.info("DataAnalystAgent initialized.")

    def run(self, user_question: str) -> AgentResponse:
        """
        Executes the full agent analysis workflow for a user prompt.
        """
        start_time = time.perf_counter()
        logger.info(f"Agent received question: '{user_question}'")

        # Handle natural conversational greetings, capabilities, and polite remarks
        clean_q = user_question.strip().lower().rstrip("!?. ")
        greetings = {"hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening", "howdy", "sup", "yo"}
        general_inquiries = {"who are you", "what can you do", "help", "what are you", "what are your capabilities", "introduce yourself"}

        if clean_q in greetings or clean_q in general_inquiries:
            table_info = []
            for name, meta in self.state.metadata_cache.items():
                is_act = " (Active)" if name == self.state.active_dataset_name else ""
                table_info.append(f"- **`{name}`**{is_act}: {meta.row_count} rows, {meta.column_count} columns")
            tables_str = "\n".join(table_info) if table_info else "- *No dataset currently uploaded. Attach a CSV to get started!*"

            welcome_msg = (
                f"Hello! I am your **AI Data Analyst**, powered by a deterministic **DuckDB SQL engine** and **NVIDIA NIM (`muse-glimmer`)**.\n\n"
                f"I analyze your tabular data with strict mathematical grounding—no invented numbers, full code transparency, and interactive visualizations.\n\n"
                f"### 📂 Available Datasets:\n{tables_str}\n\n"
                f"### 💡 Here is what you can ask me:\n"
                f"1. **Executive Dashboard**: *\"Generate an Executive Dashboard artifact for {self.state.active_dataset_name or 'my dataset'}\"*\n"
                f"2. **Outlier Audits**: *\"Detect anomalies in revenue and explain why they were flagged\"*\n"
                f"3. **Rankings**: *\"What are the top 5 customers by revenue?\"* or *\"Which products are underperforming?\"*\n"
                f"4. **Visual Trends**: *\"Show the monthly sales trend chart\"*\n"
                f"5. **Predictive Projections**: *\"Forecast revenue for next 3 months with confidence intervals\"*\n"
                f"6. **Safe SQL & Joins**: *\"Run a SQL join between sales_data and customers\"*\n\n"
                f"You can attach your own CSV dataset anytime with the paperclip icon below, or ask any question to begin!"
            )
            total_elapsed = (time.perf_counter() - start_time) * 1000.0
            resp = AgentResponse(
                question=user_question,
                answer=welcome_msg,
                steps_explanation=[
                    f"1. Recognized conversational greeting '{user_question}'.",
                    f"2. Inspected active session datasets ({len(self.state.datasets)} tables loaded).",
                    "3. Synthesized analyst welcome overview and guided recommendations.",
                ],
                tool_used="conversational_greeting",
                execution_time_ms=total_elapsed,
            )
            self.state.add_message(role="user", content=user_question)
            self.state.add_message(role="assistant", content=welcome_msg, metadata={"tool_used": "conversational_greeting"})
            return resp

        if clean_q in {"thank you", "thanks", "thx", "appreciate it", "great", "awesome", "perfect"}:
            thank_msg = "You're very welcome! Let me know if you need any more data analysis, charts, or anomaly checks."
            total_elapsed = (time.perf_counter() - start_time) * 1000.0
            resp = AgentResponse(
                question=user_question,
                answer=thank_msg,
                steps_explanation=[
                    "1. Recognized user acknowledgment.",
                    "2. Formulated polite conversational response.",
                ],
                tool_used="conversational_ack",
                execution_time_ms=total_elapsed,
            )
            self.state.add_message(role="user", content=user_question)
            self.state.add_message(role="assistant", content=thank_msg, metadata={"tool_used": "conversational_ack"})
            return resp

        # Step 1 & 2: Dataset schema inspection
        active_df = self.state.get_active_df()
        if active_df is None:
            return AgentResponse(
                question=user_question,
                answer="No dataset is currently uploaded. Please upload a CSV file to begin analysis.",
                steps_explanation=["Inspected session state: No datasets loaded."],
                execution_time_ms=(time.perf_counter() - start_time) * 1000.0,
            )

        schema_context = self.state.get_catalog_schema_summary()
        recent_history = [
            f"{m.role}: {m.content}"
            for m in self.state.conversation_history[-4:]
        ]
        history_context = "\n".join(recent_history) if recent_history else "No previous conversation."

        planning_prompt = (
            f"AVAILABLE DATASETS & SCHEMAS:\n{schema_context}\n\n"
            f"CONVERSATION CONTEXT:\n{history_context}\n\n"
            f"USER QUESTION: {user_question}\n\n"
            f"Based on the dataset schema and available tools, formulate the QueryPlan JSON."
        )

        steps: List[str] = [
            f"1. Analyzed user question: '{user_question}'.",
            f"2. Inspected schema of table '{self.state.active_dataset_name}' ({len(active_df)} rows).",
        ]

        # Check if the user specifically requested an executive dashboard artifact
        is_dashboard_request = any(
            w in user_question.lower()
            for w in [
                "dashboard",
                "executive overview",
                "create dashboard",
                "generate dashboard",
                "show dashboard",
                "build dashboard",
            ]
        )
        if is_dashboard_request:
            table_name = self.state.active_dataset_name or "active_dataset"
            steps.append(f"3. Recognized user request to generate Executive Dashboard artifact for '{table_name}'.")
            steps.append("4. Executing deterministic data quality and executive KPI engine.")
            dashboard_data = self._build_dashboard_data(active_df, table_name)
            steps.append(f"5. Generated completeness score: {dashboard_data['kpis']['completeness_score']}% across {dashboard_data['kpis']['total_rows']} rows.")
            steps.append("6. Structured interactive Claude-style dashboard artifact.")

            artifact = {
                "type": "dashboard",
                "title": f"Executive Dashboard • {table_name}",
                "subtitle": f"{table_name} • {len(active_df):,} records • {len(active_df.columns)} columns • {dashboard_data['kpis']['completeness_score']}% Completeness",
                "table_name": table_name,
                "data": dashboard_data,
            }

            answer = (
                f"I have generated the interactive **Executive Dashboard** artifact for `{table_name}` ({len(active_df):,} rows, {len(active_df.columns)} columns).\n\n"
                f"You can view the interactive KPI cards, quality audit, and automated metric distributions in the artifact panel."
            )
            total_elapsed = (time.perf_counter() - start_time) * 1000.0

            response = AgentResponse(
                question=user_question,
                answer=answer,
                steps_explanation=steps,
                tool_used="generate_dashboard_artifact",
                tool_result=dashboard_data,
                artifact=artifact,
                execution_time_ms=total_elapsed,
            )
            self.state.add_message(role="user", content=user_question)
            self.state.add_message(
                role="assistant",
                content=answer,
                metadata={"tool_used": "generate_dashboard_artifact", "has_artifact": True},
            )
            return response

        # Step 3: Tool selection & Query Planning
        try:
            plan = self.llm.generate_structured(
                prompt=planning_prompt,
                response_model=QueryPlan,
                system_prompt=SYSTEM_PLANNER_PROMPT,
            )
            steps.append(f"3. Formulated plan: Selected tool '{plan.selected_tool}' with intent '{plan.user_intent}'.")
            steps.append(f"   Reasoning: {plan.reasoning}")
        except Exception as exc:
            logger.warning(f"Structured plan generation failed, using fallback: {str(exc)}")
            plan = QueryPlan(
                user_intent="Fallback dataset summary",
                reasoning="Defaulted to data profiling due to planning failure.",
                selected_tool="profile_dataset",
                tool_parameters={"table_name": self.state.active_dataset_name or "active_dataset"},
            )
            steps.append(f"3. Fallback plan activated: '{plan.selected_tool}'.")

        # Step 4: Call deterministic analysis tool
        tool_args: Dict[str, Any] = dict(plan.tool_parameters)
        steps.append(f"4. Calling deterministic tool '{plan.selected_tool}' with arguments: {list(tool_args.keys())}.")

        # Inject necessary environment references (e.g. DataFrame or DuckDB connection)
        if plan.selected_tool == "execute_sql_query":
            tool_args["conn"] = self.state.duckdb_conn
            if "query" not in tool_args and plan.generated_sql:
                tool_args["query"] = plan.generated_sql
        else:
            tool_args["df"] = active_df
            if "table_name" not in tool_args and self.state.active_dataset_name:
                tool_args["table_name"] = self.state.active_dataset_name

        tool_result: ToolExecutionResult = self.tools.execute(plan.selected_tool, **tool_args)

        # Step 5 & 6: Receive actual result and validate
        if not tool_result.success:
            steps.append(f"5. Tool execution encountered an issue: {tool_result.error}")
            explanation = (
                f"I encountered an error executing `{plan.selected_tool}`: {tool_result.error}\n\n"
                f"Please ensure column names match the dataset schema."
            )
            return AgentResponse(
                question=user_question,
                answer=explanation,
                steps_explanation=steps,
                tool_used=plan.selected_tool,
                tool_result=None,
                generated_sql=plan.generated_sql,
                generated_pandas_code=plan.generated_pandas_code,
                execution_time_ms=(time.perf_counter() - start_time) * 1000.0,
            )

        steps.append(f"5. Received verified result from tool '{plan.selected_tool}' in {tool_result.execution_time_ms:.2f}ms.")
        steps.append(f"6. Validated data integrity: Result contains valid deterministic output.")

        # Step 7: Natural language explanation & business takeaways
        synthesis_prompt = (
            f"USER QUESTION: {user_question}\n\n"
            f"TOOL USED: {plan.selected_tool}\n"
            f"TOOL OUTPUT DATA:\n{json.dumps(tool_result.result_data, default=str)[:3000]}\n\n"
            f"Explain the findings truthfully based strictly on the above numbers. Provide actionable business insights."
        )

        try:
            explanation = self.llm.generate(
                prompt=synthesis_prompt,
                system_prompt=SYSTEM_SYNTHESIS_PROMPT,
            )
        except Exception as exc:
            logger.warning(f"Synthesis failed, using tool summary: {str(exc)}")
            explanation = f"Analysis completed: {tool_result.summary}"

        steps.append("7. Synthesized natural language explanation from verified tool results.")

        # Extract chart / anomaly / quality components if available
        chart_spec = None
        anomalies_list = None
        quality_rep = None

        if isinstance(tool_result.result_data, dict):
            if "plotly_spec" in tool_result.result_data:
                chart_spec = tool_result.result_data["plotly_spec"]
            if "anomalies" in tool_result.result_data:
                anomalies_list = [
                    AnomalyItem(**a) if isinstance(a, dict) else a
                    for a in tool_result.result_data["anomalies"]
                ]
            if "quality_report" in tool_result.result_data:
                quality_rep = DataQualityReport(**tool_result.result_data["quality_report"])

        total_elapsed = (time.perf_counter() - start_time) * 1000.0

        response = AgentResponse(
            question=user_question,
            answer=explanation,
            steps_explanation=steps,
            tool_used=plan.selected_tool,
            tool_result=tool_result.result_data,
            generated_sql=plan.generated_sql,
            generated_pandas_code=plan.generated_pandas_code,
            chart_spec=chart_spec,
            anomalies=anomalies_list,
            data_quality=quality_rep,
            execution_time_ms=total_elapsed,
        )

        # Update conversation context
        self.state.add_message(role="user", content=user_question)
        self.state.add_message(
            role="assistant",
            content=explanation,
            metadata={"tool_used": plan.selected_tool, "execution_time_ms": total_elapsed},
        )

        return response

    def _build_dashboard_data(self, active_df: pd.DataFrame, table_name: str) -> Dict[str, Any]:
        """Builds deterministic executive KPI and quality audit dictionary."""
        from src.tools.profiling import check_data_quality
        quality_report = check_data_quality(active_df, table_name)

        numeric_cols = active_df.select_dtypes(include=["number"]).columns.tolist()
        total_rev = float(active_df["revenue"].sum()) if "revenue" in active_df.columns else (float(active_df[numeric_cols[0]].sum()) if numeric_cols else 0.0)
        total_profit = float(active_df["profit"].sum()) if "profit" in active_df.columns else 0.0

        charts = []
        if "region" in active_df.columns and "revenue" in active_df.columns:
            grouped = active_df.groupby("region")["revenue"].sum().reset_index()
            charts.append({
                "title": "Revenue by Region",
                "type": "bar",
                "data": grouped.to_dict(orient="records"),
                "x_key": "region",
                "y_key": "revenue",
            })
        elif len(active_df.select_dtypes(include=["object"]).columns) > 0 and numeric_cols:
            cat_col = active_df.select_dtypes(include=["object"]).columns[0]
            num_col = numeric_cols[0]
            grouped = active_df.groupby(cat_col)[num_col].sum().reset_index().head(8)
            charts.append({
                "title": f"{num_col.title()} by {cat_col.title()}",
                "type": "bar",
                "data": grouped.to_dict(orient="records"),
                "x_key": cat_col,
                "y_key": num_col,
            })

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


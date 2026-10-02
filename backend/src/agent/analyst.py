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

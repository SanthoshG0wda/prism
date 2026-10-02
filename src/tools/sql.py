"""
Safe SQL execution tool using DuckDB for deterministic in-memory analytics.
Enforces read-only safety checks to prevent modifying queries or dangerous operations.
"""

import re
import time
from typing import Any, Dict, List
import duckdb
import pandas as pd
from src.tools.registry import register_tool
from src.utils.logging import get_logger

logger = get_logger(__name__)

# Disallowed SQL keywords for security
DISALLOWED_SQL_PATTERNS = [
    r"\bDROP\b",
    r"\bDELETE\b",
    r"\bINSERT\b",
    r"\bUPDATE\b",
    r"\bALTER\b",
    r"\bCREATE\b",
    r"\bATTACH\b",
    r"\bDETACH\b",
    r"\bCOPY\b",
    r"\bEXPORT\b",
    r"\bIMPORT\b",
    r"\bPRAGMA\b",
    r"\bINSTALL\b",
    r"\bLOAD\b",
]


def validate_sql_safety(query: str) -> None:
    """
    Validates that a SQL query contains only safe read-only operations.
    Raises ValueError if unauthorized patterns are detected.
    """
    cleaned_query = query.strip()
    if not cleaned_query:
        raise ValueError("SQL query cannot be empty.")

    for pattern in DISALLOWED_SQL_PATTERNS:
        if re.search(pattern, cleaned_query, re.IGNORECASE):
            raise ValueError(f"Security violation: Query contains forbidden statement matching '{pattern}'. Only read-only queries are permitted.")


def execute_sql(
    query: str,
    conn: duckdb.DuckDBPyConnection,
    max_rows: int = 500,
) -> Dict[str, Any]:
    """
    Executes a safe read-only SQL query against DuckDB and returns the result as records and columns.
    """
    validate_sql_safety(query)
    start_time = time.perf_counter()

    logger.info(f"Running SQL query: {query}")
    try:
        # Execute query directly on connection
        df_result: pd.DataFrame = conn.execute(query).df()
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        total_rows = len(df_result)
        truncated = False
        if total_rows > max_rows:
            df_result = df_result.head(max_rows)
            truncated = True

        # Convert timestamps and NaNs to serializable objects
        records: List[Dict[str, Any]] = df_result.to_dict(orient="records")

        # Clean NaN/inf for strict JSON serialization
        for row in records:
            for k, v in row.items():
                if pd.isna(v):
                    row[k] = None
                elif hasattr(v, "isoformat"):
                    row[k] = v.isoformat()

        columns = list(df_result.columns)

        summary = f"SQL executed in {elapsed_ms:.2f}ms. Returned {total_rows} row(s)."
        if truncated:
            summary += f" Truncated to first {max_rows} rows for display."

        return {
            "query": query,
            "columns": columns,
            "records": records,
            "row_count": total_rows,
            "truncated": truncated,
            "execution_time_ms": elapsed_ms,
            "summary": summary,
        }
    except Exception as exc:
        logger.error(f"SQL execution failed: {str(exc)}")
        raise RuntimeError(f"DuckDB SQL error: {str(exc)}") from exc


@register_tool(
    name="execute_sql_query",
    description="Executes a safe, read-only SQL query against the loaded datasets using DuckDB and returns the tabulated result.",
    parameter_schema={
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The read-only SQL query to execute (e.g. SELECT region, SUM(revenue) FROM sales GROUP BY region ORDER BY SUM(revenue) DESC).",
            },
            "max_rows": {
                "type": "integer",
                "description": "Maximum number of rows to return (default: 500).",
                "default": 500,
            }
        },
        "required": ["query"],
    }
)
def tool_execute_sql_query(
    query: str,
    conn: duckdb.DuckDBPyConnection,
    max_rows: int = 500,
) -> Dict[str, Any]:
    """Tool wrapper for safe SQL query execution."""
    return execute_sql(query=query, conn=conn, max_rows=max_rows)

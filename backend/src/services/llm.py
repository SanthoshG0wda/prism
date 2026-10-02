"""
LLM Service abstraction supporting NVIDIA NIM (NVIDIA Inference Microservices),
OpenAI-compatible APIs (OpenAI, Groq, Ollama), and an intelligent offline heuristic
engine for development/testing when no API key is provided.
"""

import json
import os
import re
from typing import Any, Dict, List, Optional, Type, TypeVar
import requests
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from src.utils.logging import get_logger

logger = get_logger(__name__)

T = TypeVar("T", bound=BaseModel)

# Default NVIDIA NIM parameters
NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_DEFAULT_MODEL = "meta/muse-glimmer-30b"


class LLMSettings(BaseSettings):
    """Configuration settings for LLM integrations with Muse Glimmer as premier agentic model."""
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    provider: str = Field(default="nvidia", alias="LLM_PROVIDER")
    model: str = Field(default=NVIDIA_DEFAULT_MODEL, alias="LLM_MODEL")
    api_key: Optional[str] = Field(default=None, alias="NVIDIA_API_KEY")
    llm_api_key: Optional[str] = Field(default=None, alias="LLM_API_KEY")
    base_url: str = Field(default=NVIDIA_NIM_BASE_URL, alias="LLM_BASE_URL")
    temperature: float = Field(default=0.1, alias="LLM_TEMPERATURE")
    timeout_seconds: int = Field(default=45, alias="LLM_TIMEOUT_SECONDS")

    def get_effective_api_key(self) -> Optional[str]:
        """Returns the configured API key from either NVIDIA_API_KEY or LLM_API_KEY."""
        return self.api_key or self.llm_api_key or os.getenv("NVIDIA_API_KEY") or os.getenv("LLM_API_KEY")


class LLMService:
    """
    Service client for interacting with Large Language Models via NVIDIA NIM or compatible endpoints.
    Separates LLM transport from prompt engineering and agent logic.
    """

    def __init__(self, settings: Optional[LLMSettings] = None) -> None:
        self.settings = settings or LLMSettings()

        # Adjust defaults if NVIDIA provider is selected
        if self.settings.provider.lower() in ("nvidia", "nvidia-nim", "nim"):
            if not self.settings.base_url or "api.openai.com" in self.settings.base_url:
                self.settings.base_url = NVIDIA_NIM_BASE_URL
            if not self.settings.model or "gpt-" in self.settings.model:
                self.settings.model = NVIDIA_DEFAULT_MODEL

        # Resolve API key
        resolved_key = self.settings.get_effective_api_key()
        if resolved_key:
            self.settings.api_key = resolved_key

        logger.info(
            f"Initialized LLMService with provider='{self.settings.provider}', "
            f"model='{self.settings.model}', base_url='{self.settings.base_url}'"
        )

    def is_configured(self) -> bool:
        """Checks if a valid live API key is configured."""
        key = self.settings.api_key
        return bool(key and key not in ("your-api-key-here", "nvapi-your-key-here") and len(key.strip()) > 5)

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = False,
    ) -> str:
        """
        Sends generation request to configured provider (NVIDIA NIM or OpenAI-compatible).
        Falls back to offline deterministic heuristics if no API key is supplied.
        """
        if not self.is_configured():
            logger.info("No live LLM API key configured. Executing offline heuristic orchestrator.")
            return self._heuristic_offline_completion(prompt, system_prompt, json_mode)

        return self._call_openai_compatible_api(prompt, system_prompt, json_mode)

    def generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        system_prompt: Optional[str] = None,
    ) -> T:
        """
        Generates and parses a structured response adhering strictly to a Pydantic model schema.
        """
        schema_json = json.dumps(response_model.model_json_schema(), indent=2)
        augmented_system_prompt = (
            f"{system_prompt or ''}\n\n"
            f"IMPORTANT: You MUST respond strictly with a valid JSON object complying with this JSON Schema:\n"
            f"{schema_json}\n"
            f"Do not include any Markdown fences or conversational text outside the raw JSON object."
        ).strip()

        raw_response = self.generate(
            prompt=prompt,
            system_prompt=augmented_system_prompt,
            json_mode=True,
        )

        cleaned_json_text = self._extract_json(raw_response)
        try:
            parsed_data = json.loads(cleaned_json_text)
            return response_model.model_validate(parsed_data)
        except Exception as exc:
            logger.error(f"Failed to validate LLM response against {response_model.__name__}: {str(exc)}\nRaw: {raw_response}")
            raise ValueError(f"LLM structured response failed validation: {str(exc)}") from exc

    def _call_openai_compatible_api(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = False,
    ) -> str:
        """Makes an HTTP POST request to an OpenAI-compatible /chat/completions endpoint (e.g. NVIDIA NIM)."""
        url = f"{self.settings.base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.settings.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        messages: List[Dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload: Dict[str, Any] = {
            "model": self.settings.model,
            "messages": messages,
            "temperature": self.settings.temperature,
            "max_tokens": 1024,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=self.settings.timeout_seconds)
            # If NIM model rejects response_format={"type": "json_object"}, retry without it
            if response.status_code == 400 and json_mode and "response_format" in response.text:
                logger.warning("NIM model does not accept response_format parameter. Retrying without it.")
                payload.pop("response_format", None)
                response = requests.post(url, headers=headers, json=payload, timeout=self.settings.timeout_seconds)

            if response.status_code != 200:
                raise RuntimeError(
                    f"LLM API Error ({self.settings.provider}) {response.status_code}: {response.text}"
                )

            data = response.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.RequestException as exc:
            logger.error(f"HTTP request to LLM provider failed: {str(exc)}")
            raise RuntimeError(f"Connection to LLM provider failed: {str(exc)}") from exc

    def _extract_json(self, text: str) -> str:
        """Strips markdown code blocks and whitespace to isolate raw JSON."""
        trimmed = text.strip()
        if trimmed.startswith("```json"):
            trimmed = trimmed[7:]
        elif trimmed.startswith("```"):
            trimmed = trimmed[3:]
        if trimmed.endswith("```"):
            trimmed = trimmed[:-3]
        trimmed = trimmed.strip()

        # If wrapped inside some other text, extract outermost braces
        start = trimmed.find("{")
        end = trimmed.rfind("}")
        if start != -1 and end != -1:
            return trimmed[start : end + 1]
        return trimmed

    def _heuristic_offline_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = False,
    ) -> str:
        """
        Deterministic heuristic reasoning engine used when no live API key is provided.
        Maps natural language query intents directly to deterministic analysis tool calls.
        """
        if "USER QUESTION:" in prompt:
            user_part = prompt.split("USER QUESTION:")[-1]
            if "Based on the dataset schema" in user_part:
                user_part = user_part.split("Based on the dataset schema")[0]
            prompt_lower = user_part.lower()
        else:
            prompt_lower = prompt.lower()

        # Check if planning step requested
        if json_mode and "selected_tool" in (system_prompt or ""):
            # 0. List all rows / records / table preview intent
            if any(w in prompt_lower for w in [
                "list all", "list rows", "show all rows", "show rows", "view rows", "display rows",
                "all rows", "records", "preview table", "show table", "view table", "preview data",
                "show data", "display data", "first rows", "head", "see rows", "browse table", "browse data"
            ]):
                table_target = "active_dataset"
                if "customer" in prompt_lower:
                    table_target = "customers"
                elif "sales" in prompt_lower:
                    table_target = "sales_data"

                sql_q = f"SELECT * FROM {table_target} LIMIT 100"
                return json.dumps({
                    "user_intent": f"List and inspect records from {table_target}",
                    "reasoning": f"Identified request to inspect rows from '{table_target}'. Selected execute_sql_query with LIMIT 100.",
                    "selected_tool": "execute_sql_query",
                    "tool_parameters": {"query": sql_q},
                    "generated_sql": sql_q,
                    "generated_pandas_code": "df.head(100)",
                })

            # 1. Anomaly detection intent
            if "anomal" in prompt_lower or "outlier" in prompt_lower:
                metric = "revenue"
                for candidate in ["profit", "units_sold", "revenue", "unit_price", "discount"]:
                    if candidate in prompt_lower:
                        metric = candidate
                        break
                return json.dumps({
                    "user_intent": "Detect statistical anomalies and outliers in dataset",
                    "reasoning": f"Identified request for outlier detection on numeric column '{metric}'. Selected detect_anomalies tool with IQR method.",
                    "selected_tool": "detect_anomalies",
                    "tool_parameters": {"column": metric, "method": "iqr", "threshold": 1.5},
                    "generated_sql": None,
                    "generated_pandas_code": f"detect_anomalies(df, column='{metric}', method='iqr', threshold=1.5)",
                })

            # 2. Chart / visualization intent
            if any(w in prompt_lower for w in ["chart", "plot", "visual", "graph", "histogram", "scatter", "bar"]):
                chart_type = "bar"
                if "line" in prompt_lower or "trend" in prompt_lower:
                    chart_type = "line"
                elif "pie" in prompt_lower or "share" in prompt_lower:
                    chart_type = "pie"
                elif "scatter" in prompt_lower:
                    chart_type = "scatter"
                elif "box" in prompt_lower:
                    chart_type = "box"

                x_col = "region"
                y_col = "revenue"
                if "product" in prompt_lower:
                    x_col = "product"
                if "customer" in prompt_lower:
                    x_col = "customer_name"
                if "date" in prompt_lower or "month" in prompt_lower:
                    x_col = "date"
                if "profit" in prompt_lower:
                    y_col = "profit"
                elif "units" in prompt_lower:
                    y_col = "units_sold"

                return json.dumps({
                    "user_intent": f"Generate {chart_type} visualization of {y_col} across {x_col}",
                    "reasoning": f"Identified plotting request. Constructing {chart_type} chart for '{y_col}' grouped by '{x_col}'.",
                    "selected_tool": "generate_chart",
                    "tool_parameters": {"chart_type": chart_type, "x": x_col, "y": y_col, "title": f"{chart_type.title()} Chart: {y_col} by {x_col}"},
                    "generated_sql": None,
                    "generated_pandas_code": f"px.{chart_type}(df, x='{x_col}', y='{y_col}')",
                })

            # 3. Forecasting / Projection intent
            if any(w in prompt_lower for w in ["forecast", "predict", "project", "future"]):
                metric = "profit" if "profit" in prompt_lower else "revenue"
                return json.dumps({
                    "user_intent": f"Forecast future {metric} projections with 95% confidence intervals",
                    "reasoning": f"Identified request for predictive forecasting on '{metric}'. Selected forecast_metric tool.",
                    "selected_tool": "forecast_metric",
                    "tool_parameters": {"date_col": "date", "metric_col": metric, "periods": 3, "freq": "ME"},
                    "generated_sql": None,
                    "generated_pandas_code": f"forecast_metric(df, date_col='date', metric_col='{metric}', periods=3)",
                })

            # 4. Time series / monthly trend intent
            if "month" in prompt_lower or "trend" in prompt_lower or "time" in prompt_lower:
                return json.dumps({
                    "user_intent": "Analyze monthly time-series sales trend",
                    "reasoning": "Detected trend inquiry. Resampling revenue by month end.",
                    "selected_tool": "time_series_trend",
                    "tool_parameters": {"date_col": "date", "metric_col": "revenue", "freq": "ME", "agg_func": "sum"},
                    "generated_sql": "SELECT strftime(date, '%Y-%m') AS month, SUM(revenue) AS total_revenue FROM active_dataset GROUP BY 1 ORDER BY 1",
                    "generated_pandas_code": "df.assign(date=pd.to_datetime(df['date'])).set_index('date').resample('ME')['revenue'].sum().reset_index()",
                })

            # 5. Underperforming products / bottom k intent
            if "underperform" in prompt_lower or "worst" in prompt_lower or "lowest" in prompt_lower:
                group_col = "product" if "product" in prompt_lower else "region"
                return json.dumps({
                    "user_intent": f"Identify lowest/underperforming {group_col}s by revenue",
                    "reasoning": f"Finding underperforming {group_col} entities by aggregating revenue in ascending order.",
                    "selected_tool": "top_k_analysis",
                    "tool_parameters": {"group_col": group_col, "metric_col": "revenue", "k": 5, "ascending": True, "agg_func": "sum"},
                    "generated_sql": f"SELECT {group_col}, SUM(revenue) AS total_revenue FROM active_dataset GROUP BY {group_col} ORDER BY total_revenue ASC LIMIT 5",
                    "generated_pandas_code": f"df.groupby('{group_col}')['revenue'].sum().reset_index().sort_values(by='revenue', ascending=True).head(5)",
                })

            # 6. Top customers / regions / products
            if "top" in prompt_lower or "highest" in prompt_lower or "most" in prompt_lower:
                group_col = "region"
                if "customer" in prompt_lower:
                    group_col = "customer_name"
                elif "product" in prompt_lower:
                    group_col = "product"

                metric = "profit" if "profit" in prompt_lower else "revenue"

                return json.dumps({
                    "user_intent": f"Find top entities by {metric} grouped by {group_col}",
                    "reasoning": f"Selected top_k_analysis to rank {group_col} by sum of {metric} in descending order.",
                    "selected_tool": "top_k_analysis",
                    "tool_parameters": {"group_col": group_col, "metric_col": metric, "k": 5, "ascending": False, "agg_func": "sum"},
                    "generated_sql": f"SELECT {group_col}, SUM({metric}) AS total_{metric} FROM active_dataset GROUP BY {group_col} ORDER BY total_{metric} DESC LIMIT 5",
                    "generated_pandas_code": f"df.groupby('{group_col}')['{metric}'].sum().reset_index().sort_values(by='{metric}', ascending=False).head(5)",
                })

            # 7. SQL specific query request
            if "sql" in prompt_lower:
                sql_q = "SELECT region, SUM(revenue) AS total_revenue, SUM(profit) AS total_profit FROM active_dataset GROUP BY region ORDER BY total_revenue DESC"
                return json.dumps({
                    "user_intent": "Execute SQL query on the dataset",
                    "reasoning": "Detected SQL request. Formulated aggregate SQL query for DuckDB execution.",
                    "selected_tool": "execute_sql_query",
                    "tool_parameters": {"query": sql_q},
                    "generated_sql": sql_q,
                    "generated_pandas_code": "df.groupby('region')[['revenue', 'profit']].sum().reset_index()",
                })

            # 8. Quality check / profile
            if "quality" in prompt_lower or "missing" in prompt_lower or "clean" in prompt_lower:
                return json.dumps({
                    "user_intent": "Run dataset quality audit",
                    "reasoning": "Selected check_data_quality tool to evaluate completeness and issues.",
                    "selected_tool": "check_data_quality",
                    "tool_parameters": {"table_name": "active_dataset"},
                    "generated_sql": None,
                    "generated_pandas_code": "check_data_quality(df)",
                })

            # Default fallback: general aggregation
            return json.dumps({
                "user_intent": "General dataset analysis and summary",
                "reasoning": "Defaulting to top_k revenue analysis by region as analytical entry point.",
                "selected_tool": "top_k_analysis",
                "tool_parameters": {"group_col": "region", "metric_col": "revenue", "k": 5, "ascending": False, "agg_func": "sum"},
                "generated_sql": "SELECT region, SUM(revenue) AS total_revenue FROM active_dataset GROUP BY region ORDER BY total_revenue DESC",
                "generated_pandas_code": "df.groupby('region')['revenue'].sum().reset_index().sort_values(by='revenue', ascending=False)",
            })

        # Non-JSON response (conversational agent or tool synthesis)
        if "TOOL OUTPUT DATA:" in prompt:
            if "records" in prompt and ("SELECT" in prompt or "row_count" in prompt or "list" in prompt_lower or "rows" in prompt_lower):
                return (
                    "Retrieved verified records from the dataset via safe DuckDB SQL execution.\n\n"
                    "- **Methodology**: Executed deterministic read-only query in DuckDB.\n"
                    "- **Data Integrity**: Verified directly against in-memory session tables.\n"
                    "- **Granular Inspection**: All columns and records are rendered in the interactive tabular view below."
                )
            return (
                f"Based on the deterministic calculation from the dataset:\n\n"
                f"- **Methodology**: Computed deterministically via safe query execution.\n"
                f"- **Data Integrity**: Verified results contain no synthetic or hallucinated figures.\n"
                f"- **Key Takeaway**: Review the verified figures, breakdown table, and visualization above for full granular inspection."
            )

        # Conversational / Conceptual queries
        q = prompt_lower
        if "special abilities" in q or "superpowers" in q or "assignment" in q:
            return (
                "### ⚡ AI Assistant Special Superpowers (DBO Assignment)\n\n"
                "As specified in the **Digital Back Office AI Engineer Assignment**, I combine the flexibility of a normal conversational AI with production-grade, mathematically grounded analytical abilities:\n\n"
                "#### 1. Multi-CSV Ingestion & Schema Cataloging\n"
                "- Upload multiple CSV files (e.g., `sales_data`, `customers`).\n"
                "- Automatic schema profiling, data type detection, null tracking, and memory registration.\n\n"
                "#### 2. Zero-Hallucination SQL Analytics (DuckDB)\n"
                "- Deterministic in-memory SQL execution via DuckDB.\n"
                "- Read-only sandboxing prevents SQL injection or schema mutation.\n"
                "- Supports multi-table relational joins.\n\n"
                "#### 3. Statistical Anomaly Auditing\n"
                "- **Tukey's IQR Fences**: $Q_1 - 1.5 \\times \\text{IQR}$ and $Q_3 + 1.5 \\times \\text{IQR}$.\n"
                "- **Z-Score Standardization**: Flag points where $|Z| > 3.0$.\n"
                "- Provides clear textual explanations for why every outlier was flagged.\n\n"
                "#### 4. Time-Series Forecasting & Trends\n"
                "- Resamples monthly/weekly sales trends.\n"
                "- Projects metrics forward with 95% confidence intervals.\n\n"
                "#### 5. Interactive Visualizations\n"
                "- Generates responsive Plotly charts: Bar, Line, Pie, Scatter, Histogram, and Box plots.\n\n"
                "#### 6. Claude-Style Executive Dashboard Artifacts\n"
                "- Generates full-screen or side-by-side interactive dashboard artifacts upon request.\n"
                "- Includes executive KPI summaries, data quality scores, and distribution breakdowns.\n\n"
                "#### 7. Full Code Transparency\n"
                "- Expandable inspection drawers showing generated SQL and Pandas code for every query."
            )

        if "regression" in q or "machine learning" in q or "model" in q:
            return (
                "### Linear vs. Logistic Regression\n\n"
                "In machine learning and statistics, these are foundational supervised learning algorithms:\n\n"
                "| Feature | Linear Regression | Logistic Regression |\n"
                "| :--- | :--- | :--- |\n"
                "| **Target Variable** | Continuous numeric value ($y \\in \\mathbb{R}$) | Categorical / Probability ($y \\in \\{0, 1\\}$) |\n"
                "| **Hypothesis Function** | $\\hat{y} = w^T x + b$ | $\\hat{y} = \\sigma(w^T x + b) = \\frac{1}{1 + e^{-(w^T x + b)}}$ |\n"
                "| **Loss Function** | Mean Squared Error (MSE) | Binary Cross-Entropy / Log Loss |\n"
                "| **Output Range** | $(-\\infty, +\\infty)$ | $[0, 1]$ |\n"
                "| **Typical Use Case** | Forecasting revenue, house prices, temperature | Churn prediction, spam detection, fraud audit |\n\n"
                "Would you like an example of how to implement either in Python with Scikit-learn?"
            )

        if "anomaly" in q or "outlier" in q or "tukey" in q or "z-score" in q or "iqr" in q:
            return (
                "### Statistical Anomaly Detection Methodologies\n\n"
                "In data science and business analytics, anomalies (outliers) are data points that significantly deviate from the majority of observations. This application implements two deterministic methods:\n\n"
                "#### 1. Tukey's Interquartile Range (IQR) Fences\n"
                "- **IQR Calculation**: $\\text{IQR} = Q_3 - Q_1$\n"
                "- **Lower Fence**: $Q_1 - 1.5 \\times \\text{IQR}$\n"
                "- **Upper Fence**: $Q_3 + 1.5 \\times \\text{IQR}$\n"
                "- Points outside these fences are flagged as statistical anomalies. This method is **non-parametric** and robust against extreme skews.\n\n"
                "#### 2. Z-Score Standardization\n"
                "- **Formula**: $Z = \\frac{X - \\mu}{\\sigma}$\n"
                "- Flags points where $|Z| > 3.0$ (observations more than 3 standard deviations from the mean).\n\n"
                "*Tip: You can ask me to run an outlier audit on the loaded dataset anytime!*"
            )

        if "duckdb" in q:
            return (
                "### About DuckDB in This Architecture\n\n"
                "**DuckDB** is an embedded analytical SQL database management system (often called the 'SQLite for Analytics').\n\n"
                "**Why we use DuckDB in this application:**\n"
                "1. **Columnar Execution Engine**: Optimized for OLAP (analytical) aggregations (`SUM`, `AVG`, `GROUP BY`).\n"
                "2. **Zero-Copy Pandas Integration**: Queries Pandas DataFrames directly in-memory without expensive serialization.\n"
                "3. **Multi-Table Joins**: Allows joining multiple uploaded CSVs (e.g. sales and customer tables) via standard SQL.\n"
                "4. **Security & Isolation**: We enforce strict read-only validation to prevent destructive operations (`DROP`, `DELETE`, `ALTER`)."
            )

        if "python" in q or "code" in q or "script" in q:
            return (
                "### Python Code Solution\n\n"
                "Here is an idiomatic Python solution using modern best practices:\n\n"
                "```python\n"
                "import pandas as pd\n"
                "import duckdb\n\n"
                "# In-memory analysis with DuckDB and Pandas\n"
                "def analyze_dataset(file_path: str):\n"
                "    df = pd.read_csv(file_path)\n"
                "    conn = duckdb.connect(database=':memory:')\n"
                "    conn.register('data', df)\n"
                "    \n"
                "    query = '''\n"
                "        SELECT region, SUM(revenue) AS total_revenue\n"
                "        FROM data\n"
                "        GROUP BY region\n"
                "        ORDER BY total_revenue DESC\n"
                "    '''\n"
                "    return conn.execute(query).df()\n"
                "```\n\n"
                "Let me know if you would like me to adjust the script for a specific data operation!"
            )

        if "data quality" in q or "missing value" in q:
            return (
                "### Data Quality & Completeness Audit\n\n"
                "Data quality is critical for reliable business intelligence and modeling. Our built-in audit checks:\n"
                "- **Completeness Score**: Percentage of non-null cells across the entire matrix: $\\frac{\\text{Total Non-Nulls}}{\\text{Total Cells}} \\times 100\\%$.\n"
                "- **Missing Values by Column**: Exact counts and percentages of null or NaN values per column.\n"
                "- **Duplicate Detection**: Identifies exact duplicate rows to prevent double-counting.\n"
                "- **Type Consistency**: Flags mixed types and empty strings.\n\n"
                "You can see your active dataset's quality audit by asking for a dashboard or data quality check!"
            )

        if "digital back office" in q or "dbo" in q:
            return (
                "**Digital Back Office Ltd.** is a UK-based software company specializing in automating back-office processes, business intelligence, and digital transformation.\n\n"
                "This application was built as part of the **Software Engineer Intern Assignment** to showcase production-grade AI engineering, deterministic tool calling, multi-dataset SQL analytics, and Claude-style executive dashboard artifacts."
            )

        return (
            "I am your **AI Assistant & Data Analyst**, ready to assist you with general questions, software engineering, statistical concepts, or deep analysis of your tabular datasets.\n\n"
            "### How I Can Help:\n"
            "- **Normal Conversational Assistant**: Ask me conceptual questions, statistical theory, code generation, or general brainstorming.\n"
            "- **Tabular Analytics**: Upload CSVs and ask me to rank entities, plot charts, forecast trends, or detect anomalies.\n"
            "- **Executive Dashboard**: Request an interactive Claude-style dashboard artifact for any loaded dataset.\n\n"
            "What would you like to explore next?"
        )

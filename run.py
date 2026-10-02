"""
Unified launcher for the AI Data Analyst application.
Serves the FastAPI analytics backend and the pre-built React SPA at http://localhost:8000.
"""

import os
import subprocess
import sys
import uvicorn

if __name__ == "__main__":
    # Check if frontend is built
    dist_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")
    if not os.path.exists(dist_path):
        print("⚡ Building React frontend...")
        subprocess.run(["npm", "run", "build"], cwd="frontend", check=True)

    print("🚀 Starting AI Data Analyst on http://localhost:8000")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

import os
import sys

# Ensure root and backend directory and its src directory are on sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")

if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set writable SQLite path for serverless environments (e.g. Vercel /tmp)
if os.getenv("VERCEL") or not os.access(os.path.join(backend_dir, "data"), os.W_OK):
    os.environ.setdefault("SESSION_DB_PATH", "/tmp/sessions.db")

from server import app as fastapi_app

class ApiPrefixFixer:
    """Ensures all incoming requests route to FastAPI's /api prefix routes reliably."""
    def __init__(self, asgi_app):
        self.asgi_app = asgi_app

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http":
            path = scope.get("path", "")
            if path and not path.startswith("/api"):
                scope["path"] = "/api" + (path if path.startswith("/") else "/" + path)
        await self.asgi_app(scope, receive, send)

app = ApiPrefixFixer(fastapi_app)

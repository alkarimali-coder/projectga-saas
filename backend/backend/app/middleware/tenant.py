from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.security import decode_token

class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.tenant_id = None
        request.state.role = None

        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]
            payload = decode_token(token)
            request.state.tenant_id = payload.get("tenant_id")
            request.state.role = payload.get("role")
            request.state.sub = payload.get("sub")

        response = await call_next(request)
        return response

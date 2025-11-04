from functools import wraps
from fastapi import Depends, HTTPException, status, Request
from typing import List, Callable, Any
from app.core.security import get_current_user  # ✅ fixed import
from app.services.settings_cache import settings_cache
from app.services.audit import log_forbidden


def require_roles(*allowed_roles: List[str]):
    """
    Decorator for route functions:
      @require_roles("SuperAdmin", "MLAdmin")
      async def handler(...):
          ...
    Restricts access to users with matching roles.
    """

    def decorator(func: Callable[..., Any]):
        @wraps(func)
        async def wrapper(*args, request: Request = None, user=Depends(get_current_user), **kwargs):
            # Lazy initialize cached settings if needed
            if settings_cache.get("enable_rate_limiting") is None:
                try:
                    settings_cache.load()
                except Exception:
                    pass  # cache may not be fully initialized yet

            # Extract user role safely
            user_role = getattr(user, "role", None)

            # Allow access if role matches
            if user_role in allowed_roles:
                return await func(*args, request=request, user=user, **kwargs)

            # Otherwise log and raise 403
            if request is not None:
                try:
                    await log_forbidden(
                        request,
                        user,
                        reason="Role not allowed",
                        required=list(allowed_roles)
                    )
                except Exception:
                    pass  # avoid breaking on audit logging failure

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires role {allowed_roles}, got {user_role}"
            )

        return wrapper

    return decorator

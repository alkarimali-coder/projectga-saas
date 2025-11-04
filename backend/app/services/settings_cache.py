import json
import os
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.system_settings import SystemSettings

class _SettingsCache:
    """
    In-memory cache with optional Redis passthrough if REDIS_URL present.
    """
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._loaded = False
        self._redis = None
        url = os.getenv("REDIS_URL") or os.getenv("redis_url")
        if url:
            try:
                import redis
                self._redis = redis.Redis.from_url(url, decode_responses=True)
            except Exception:
                self._redis = None

    def load(self):
        db: Session = SessionLocal()
        try:
            row = db.query(SystemSettings).order_by(SystemSettings.id.desc()).first()
            if row:
                self._data = {
                    "api_version": row.api_version,
                    "rate_limit_login": row.rate_limit_login,
                    "rate_limit_general": row.rate_limit_general,
                    "rate_limit_core": row.rate_limit_core,
                    "enable_rate_limiting": row.enable_rate_limiting,
                    "redis_url": row.redis_url,
                    "updated_by": row.updated_by,
                    "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                }
                if self._redis:
                    self._redis.set("system_settings", json.dumps(self._data))
            else:
                self._data = {}
            self._loaded = True
        finally:
            db.close()

    def reload(self):
        self._loaded = False
        self.load()

    def get(self, key: str, default: Optional[Any] = None):
        if not self._loaded:
            # try Redis first
            if self._redis:
                try:
                    raw = self._redis.get("system_settings")
                    if raw:
                        self._data = json.loads(raw)
                        self._loaded = True
                except Exception:
                    pass
            if not self._loaded:
                self.load()
        return self._data.get(key, default)

    def set_many(self, data: Dict[str, Any]):
        self._data.update(data)
        if self._redis:
            try:
                import json
                self._redis.set("system_settings", json.dumps(self._data))
            except Exception:
                pass

settings_cache = _SettingsCache()

from functools import wraps
import json
import hashlib
import os

# Only import Redis if it is available
try:
    from redis import Redis
    redis = Redis(host='localhost', port=6379, db=0, decode_responses=True, socket_connect_timeout=1)
    REDIS_AVAILABLE = True
except Exception:
    REDIS_AVAILABLE = False

def cache_key(*args, **kwargs):
    clean_args = tuple(str(a) for a in args if not hasattr(a, 'execute'))
    clean_kwargs = {k: str(v) for k, v in kwargs.items() if not hasattr(v, 'execute')}
    return hashlib.md5(json.dumps([clean_args, clean_kwargs], sort_keys=True).encode()).hexdigest()

def cached(ttl=60):
    def decorator(f):
        @wraps(f)
        async def wrapper(*args, **kwargs):
            if not REDIS_AVAILABLE:
                return await f(*args, **kwargs)

            key = f"{f.__name__}:{cache_key(*args, **kwargs)}"
            try:
                cached = redis.get(key)
                if cached:
                    return json.loads(cached)
            except Exception:
                pass  # Redis down – continue without cache

            result = await f(*args, **kwargs)
            try:
                redis.setex(key, ttl, json.dumps(result))
            except Exception:
                pass
            return result
        return wrapper
    return decorator

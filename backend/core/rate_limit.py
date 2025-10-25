from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

def rate_limit():
    return limiter.shared_limit("100/day", scope="general")

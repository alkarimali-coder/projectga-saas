from slowapi import Limiter
from slowapi.util import get_remote_address

# In-memory limiter (use Redis URI later)
limiter = Limiter(key_func=get_remote_address)

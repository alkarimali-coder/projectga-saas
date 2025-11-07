import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL")
    POOL_SIZE = os.getenv("POOL_SIZE", 10)
    POOL_OVERFLOW = os.getenv("POOL_OVERFLOW", 20)
    POOL_TIMEOUT = os.getenv("POOL_TIMEOUT", 30)
    POOL_RECYCLE = os.getenv("POOL_RECYCLE", 1800)
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"

settings = Settings()


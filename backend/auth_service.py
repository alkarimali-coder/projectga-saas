import bcrypt
import jwt
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class AuthService:
    def __init__(self):
        self.SECRET_KEY = "your-secret-key"  # Replace with secure key
        self.ALGORITHM = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES = 30
        self.REFRESH_TOKEN_EXPIRE_DAYS = 7

    def hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )

    def create_secure_tokens(self, user_id: str, tenant_id: str = None):
        access_token_expires = timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS)

        access_payload = {
            "sub": user_id,
            "tenant_id": tenant_id,
            "exp": datetime.utcnow() + access_token_expires,
        }
        refresh_payload = {
            "sub": user_id,
            "tenant_id": tenant_id,
            "exp": datetime.utcnow() + refresh_token_expires,
        }

        access_token = jwt.encode(
            access_payload, self.SECRET_KEY, algorithm=self.ALGORITHM
        )
        refresh_token = jwt.encode(
            refresh_payload, self.SECRET_KEY, algorithm=self.ALGORITHM
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": int(access_token_expires.total_seconds()),
        }


auth_service = AuthService()

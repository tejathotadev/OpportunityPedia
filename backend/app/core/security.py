from datetime import datetime, timedelta, timezone
from hashlib import sha256
from functools import lru_cache

import bcrypt
import jwt
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

ROLE_PLATFORM_ADMIN = "platform_admin"


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    """Derive a stable Fernet key from JWT_SECRET for reversible secrets (SMTP)."""
    import base64

    digest = sha256((settings.JWT_SECRET or "change-me").encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(plain: str) -> str:
    return _fernet().encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt_secret(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError) as exc:
        raise ValueError("Could not decrypt stored secret") from exc


def create_access_token(
    *,
    user_id: int,
    email: str,
    role: str,
    session_version: int = 1,
) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "sv": int(session_version),
        "exp": exp,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])


# Returned on 401 when another device signed in with the same account.
SIGNED_IN_ELSEWHERE = "Signed in elsewhere. Sign in again to continue."

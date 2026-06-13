from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import httpx
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
security = HTTPBearer()

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """Verify Supabase JWT token against the Supabase Auth API and return user profile."""
    token = credentials.credentials

    # We query Supabase Auth directly to verify the user token
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.supabase_anon_key
                },
                timeout=5.0
            )
        except Exception as e:
            logger.error("supabase_auth_network_error", error=str(e))
            raise HTTPException(status_code=503, detail="Authentication server unavailable")

    if resp.status_code != 200:
        logger.warning("auth_failed", status_code=resp.status_code, body=resp.text[:200])
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    return resp.json()

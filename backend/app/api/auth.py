from fastapi import APIRouter, Depends
from app.core.security import verify_token

router = APIRouter()

@router.get("/verify")
async def verify_auth(user: dict = Depends(verify_token)):
    """A protected endpoint to verify if the client JWT token is valid."""
    return {
        "authenticated": True,
        "user_id": user.get("id"),
        "email": user.get("email"),
        "role": user.get("role")
    }

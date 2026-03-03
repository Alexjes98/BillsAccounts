import logging
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from jose import jwt
from app.core.database import get_db
from app.models.models import User

logger = logging.getLogger("auth_context")
logger.setLevel(logging.DEBUG)


def get_current_user(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header."
        )

    token = auth_header.split(" ")[1]

    try:
        claims = jwt.get_unverified_claims(token)
        email = claims.get("email")
        if not email:
            logger.error("No email found in token claims.")
            raise HTTPException(
                status_code=400, detail="Token must include email claim (use idToken)."
            )

        user = db.query(User).filter(User.email == email).first()
        if not user:
            logger.error(f"User with email {email} not found in DB.")
            raise HTTPException(status_code=404, detail="User not found in database.")

        return user
    except Exception as e:
        logger.error(f"Error parsing token: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

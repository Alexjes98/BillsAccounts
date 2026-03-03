import sys
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.context import get_current_user
from app.models.models import User
from app.schemas.user import UserOut, UserCreate, UserUpdate

logger = logging.getLogger("users_api")
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("%(levelname)s - %(message)s"))
logger.addHandler(handler)


router = APIRouter()


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("", response_model=UserOut)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        return existing_user

    new_user = User(
        name=user_in.name,
        email=user_in.email,
        base_currency=user_in.base_currency,
        password_hash=user_in.password,  # Placeholder
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch("/me", response_model=UserOut)
def update_current_user(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.debug(f"update_current_user called with: {user_in}")
    logger.debug(f"current_user is: {current_user.email}")
    try:
        if user_in.name is not None:
            current_user.name = user_in.name
            logger.debug(f"Updated user name to {user_in.name}")
        if user_in.base_currency is not None:
            current_user.base_currency = user_in.base_currency
            logger.debug(f"Updated user base_currency to {user_in.base_currency}")

        db.commit()
        db.refresh(current_user)
        logger.debug("Successfully committed user updates.")
        return current_user
    except Exception as e:
        logger.error(f"Error in update_current_user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

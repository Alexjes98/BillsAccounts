from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User
from app.schemas.user import UserOut

router = APIRouter()

# Temporary mock dependency until context is refactored
def get_current_user_dep(db: Session = Depends(get_db)):
    target_user_id = "5048520a-da77-4a94-b5e8-0376829ae095"
    user = db.query(User).filter(User.id == target_user_id).first()
    if not user:
        raise HTTPException(status_code=500, detail="No user found in context.")
    return user


@router.get("/me", response_model=UserOut)
def get_current_user(current_user: User = Depends(get_current_user_dep)):
    return current_user

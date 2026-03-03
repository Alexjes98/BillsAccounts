from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from app.schemas.person import PersonOut
from typing import Optional


class UserCreate(BaseModel):
    name: str = ""
    email: str
    base_currency: str = "USD"
    password: str = "amplify_user"  # Placeholder since auth is managed by Amplify


class UserUpdate(BaseModel):
    name: Optional[str] = None
    base_currency: Optional[str] = None


class UserOut(BaseModel):
    id: UUID
    name: Optional[str] = None
    email: str
    base_currency: str
    created_at: datetime
    person_id: Optional[UUID] = None
    person: Optional[PersonOut] = None

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

class UserOut(BaseModel):
    id: UUID
    email: str
    base_currency: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

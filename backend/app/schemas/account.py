from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal

class AccountBase(BaseModel):
    name: str
    classification: str
    type: str
    current_balance: Decimal = Decimal('0.00')
    currency: str = 'USD'

class AccountCreate(AccountBase):
    pass

class AccountOut(AccountBase):
    id: UUID
    user_id: UUID
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

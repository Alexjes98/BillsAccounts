from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional
from uuid import UUID

class CategoryOut(BaseModel):
    name: str = Field(..., description="Category name")
    icon: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class AccountOut(BaseModel):
    name: str = Field(..., description="Account name")

    model_config = ConfigDict(from_attributes=True)

class TransactionOut(BaseModel):
    id: UUID
    transaction_date: datetime
    name: str
    amount: float
    category: Optional[CategoryOut] = None
    account: Optional[AccountOut] = None

    model_config = ConfigDict(from_attributes=True)

class FreeModeData(BaseModel):
    transactions: list[TransactionOut]
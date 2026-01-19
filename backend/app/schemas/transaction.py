from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional

class TransactionBase(BaseModel):
    amount: float = Field(..., description="Transaction amount")
    currency: str = Field(default="USD", max_length=3)
    category: str = Field(..., description="Transaction category (e.g., Food, Rent)")
    description: Optional[str] = None
    date: datetime = Field(default_factory=datetime.now)
    
    @field_validator('date', mode='before')
    def parse_date(cls, v):
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v)
            except ValueError:
                # Fallback for common formats if needed
                pass
        return v

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Schema for the Free Mode JSON File
class FreeModeData(BaseModel):
    transactions: list[TransactionBase]
    metadata: Optional[dict] = {}

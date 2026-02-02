from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

class TransferCreate(BaseModel):
    from_account_id: UUID
    to_account_id: UUID
    amount: float = Field(..., gt=0)
    category_id: UUID
    transaction_date: datetime = Field(default_factory=datetime.now)
    description: str | None = None

from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.schemas.person import PersonOut

class CategoryOut(BaseModel):
    id: UUID
    name: str = Field(..., description="Category name")
    icon: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class AccountOut(BaseModel):
    id: UUID
    name: str = Field(..., description="Account name")
    type: str = Field(..., description="Account type")
    current_balance: float = Field(..., description="Account current balance")
    currency: str = Field(..., description="Account currency")
    updated_at: datetime = Field(..., description="Account updated at")

    model_config = ConfigDict(from_attributes=True)

class DebtOut(BaseModel):
    id: UUID
    user_id: UUID
    creditor_id: UUID
    debtor_id: UUID
    total_amount: float
    remaining_amount: float
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    is_settled: bool
    deleted_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class DebtCreate(BaseModel):
    creditor_id: UUID
    debtor_id: UUID
    total_amount: float = Field(..., gt=0)
    description: Optional[str] = None
    due_date: Optional[datetime] = None

class SavingsGoalOut(BaseModel):
    id: UUID
    name: str = Field(..., description="Savings goal name")
    amount: float = Field(..., description="Savings goal amount")
    updated_at: datetime = Field(..., description="Savings goal updated at")

    model_config = ConfigDict(from_attributes=True)

class TransactionOut(BaseModel):
    id: UUID
    transaction_date: datetime
    name: str
    amount: float
    category: Optional[CategoryOut] = None
    account: Optional[AccountOut] = None
    debt: Optional[DebtOut] = None
    savings_goal: Optional[SavingsGoalOut] = None
    person: Optional[PersonOut] = None

    model_config = ConfigDict(from_attributes=True)

class TransactionCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    amount: float
    transaction_date: datetime = Field(default_factory=datetime.now)
    category_id: UUID
    account_id: Optional[UUID] = None
    debt_id: Optional[UUID] = None
    savings_goal_id: Optional[UUID] = None
    person_id: Optional[UUID] = None

class FreeModeData(BaseModel):
    transactions: list[TransactionOut]
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional
from uuid import UUID

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
    name: str = Field(..., description="Debt name")
    amount: float = Field(..., description="Debt amount")
    updated_at: datetime = Field(..., description="Debt updated at")

    model_config = ConfigDict(from_attributes=True)

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

class FreeModeData(BaseModel):
    transactions: list[TransactionOut]
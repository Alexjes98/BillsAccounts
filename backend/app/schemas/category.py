from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, description="Category name")
    icon: Optional[str] = None
    color: Optional[str] = None
    type: str = Field(..., description="Category type (INCOME or EXPENSE)")

class CategoryCreate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

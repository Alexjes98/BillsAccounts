from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional
from uuid import UUID

class PersonOut(BaseModel):
    id: UUID
    name: str = Field(..., description="Person name")
    contact_info: Optional[str] = Field(None, description="Contact information")
    created_at: datetime = Field(..., description="Creation timestamp")
    
    model_config = ConfigDict(from_attributes=True)

class PersonCreate(BaseModel):
    name: str = Field(..., min_length=1, description="Person name")
    contact_info: Optional[str] = Field(None, description="Contact information")

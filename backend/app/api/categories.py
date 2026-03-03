from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.context import get_current_user
from app.models.models import Category, User, Transaction
from app.schemas.category import CategoryCreate, CategoryOut
from pydantic import BaseModel

router = APIRouter()


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None


@router.get("", response_model=List[CategoryOut])
def get_categories(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    categories = db.query(Category).filter_by(user_id=current_user.id).all()
    return categories


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = (
        db.query(Category)
        .filter_by(
            user_id=current_user.id, name=category_in.name, type=category_in.type
        )
        .first()
    )

    if existing:
        raise HTTPException(status_code=409, detail="Category already exists.")

    new_category = Category(
        user_id=current_user.id,
        name=category_in.name,
        icon=category_in.icon,
        color=category_in.color,
        type=category_in.type,
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: UUID,
    category_in: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = (
        db.query(Category)
        .filter_by(id=str(category_id), user_id=current_user.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")

    if category_in.name is not None:
        category.name = category_in.name
    if category_in.icon is not None:
        category.icon = category_in.icon
    if category_in.color is not None:
        category.color = category_in.color

    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}")
def delete_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = (
        db.query(Category)
        .filter_by(id=str(category_id), user_id=current_user.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")

    tx_count = db.query(Transaction).filter_by(category_id=str(category_id)).count()
    if tx_count > 0:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete category because it is used in transactions.",
        )

    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully."}

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.core.context import get_current_user
from app.models.models import Debt, User, Person
from app.schemas.transaction import DebtOut, DebtCreate

router = APIRouter()


class DebtUpdate(BaseModel):
    description: str | None = None
    due_date: datetime | str | None = None
    is_settled: bool | None = None


@router.get("", response_model=List[DebtOut])
def get_debts(db: Session = Depends(get_db)):
    debts = db.query(Debt).filter(Debt.deleted_at.is_(None)).all()
    return debts


@router.post("", response_model=DebtOut, status_code=status.HTTP_201_CREATED)
def create_debt(
    debt_in: DebtCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_debt = Debt(
        user_id=current_user.id,
        creditor_id=debt_in.creditor_id,
        debtor_id=debt_in.debtor_id,
        total_amount=debt_in.total_amount,
        remaining_amount=debt_in.total_amount,  # Initially same as total
        description=debt_in.description,
        due_date=debt_in.due_date,
    )

    db.add(new_debt)
    db.commit()
    db.refresh(new_debt)
    return new_debt


@router.get("/summary", response_model=List[Dict[str, Any]])
def get_debts_summary(db: Session = Depends(get_db)):
    from sqlalchemy.orm import aliased

    Creditor = aliased(Person)
    Debtor = aliased(Person)

    results = (
        db.query(
            Creditor.name.label("creditor_name"),
            Debtor.name.label("debtor_name"),
            func.count(Debt.id).label("count"),
            func.sum(Debt.total_amount).label("total_amount"),
            Debt.creditor_id,
            Debt.debtor_id,
        )
        .join(Creditor, Debt.creditor_id == Creditor.id)
        .join(Debtor, Debt.debtor_id == Debtor.id)
        .filter(Debt.deleted_at.is_(None))
        .filter(Debt.is_settled == False)
        .group_by(Debt.creditor_id, Debt.debtor_id, Creditor.name, Debtor.name)
        .all()
    )

    summary_data = []
    for row in results:
        summary_data.append(
            {
                "creditor_name": row.creditor_name,
                "debtor_name": row.debtor_name,
                "count": row.count,
                "total_amount": float(row.total_amount) if row.total_amount else 0,
            }
        )

    return summary_data


@router.put("/{debt_id}", response_model=DebtOut)
def update_debt(debt_id: UUID, debt_in: DebtUpdate, db: Session = Depends(get_db)):
    debt = (
        db.query(Debt)
        .filter(Debt.id == str(debt_id), Debt.deleted_at.is_(None))
        .first()
    )
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    if debt_in.description is not None:
        debt.description = debt_in.description
    if debt_in.due_date is not None:
        debt.due_date = debt_in.due_date
    if debt_in.is_settled is not None:
        debt.is_settled = debt_in.is_settled
        if debt.is_settled:
            debt.remaining_amount = 0

    db.commit()
    db.refresh(debt)
    return debt


@router.delete("/{debt_id}")
def delete_debt(debt_id: UUID, db: Session = Depends(get_db)):
    debt = (
        db.query(Debt)
        .filter(Debt.id == str(debt_id), Debt.deleted_at.is_(None))
        .first()
    )
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    debt.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Debt deleted successfully"}

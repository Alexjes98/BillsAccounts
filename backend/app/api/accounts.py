from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.context import get_current_user
from app.models.models import Account, Transaction, User
from app.schemas.account import AccountOut
from pydantic import BaseModel

router = APIRouter()


class AccountCreate(BaseModel):
    name: str
    type: str
    classification: str
    tags: list[str] | None = None
    current_balance: float | None = None
    currency: str | None = None


class AccountUpdate(BaseModel):
    name: str | None = None
    type: str | None = None


@router.get("", response_model=List[AccountOut])
def get_accounts(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    accounts = db.query(Account).filter_by(user_id=current_user.id).all()
    return accounts


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(
    account_in: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_account = Account(
        user_id=current_user.id,
        name=account_in.name,
        type=account_in.type,
        classification=account_in.classification,
        current_balance=account_in.current_balance,
        currency=account_in.currency,
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account


@router.put("/{account_id}", response_model=AccountOut)
def update_account(
    account_id: UUID, account_in: AccountUpdate, db: Session = Depends(get_db)
):
    account = db.query(Account).filter(Account.id == str(account_id)).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if account_in.name is not None:
        account.name = account_in.name
    if account_in.type is not None:
        account.type = account_in.type

    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}")
def delete_account(account_id: UUID, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == str(account_id)).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    db.query(Transaction).filter(Transaction.account_id == str(account_id)).delete()
    db.delete(account)

    db.commit()
    return {"message": "Account and associated transactions deleted successfully"}

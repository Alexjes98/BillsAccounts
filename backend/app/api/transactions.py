from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from app.core.database import get_db
from app.core.context import get_current_user
from app.models.models import Transaction, Category, User, Account, Debt, SavingsGoal
from app.schemas.transaction import (
    TransactionOut,
    PaginationOut,
    TransactionCreate,
    CategoryOut,
    AccountOut,
    DebtOut,
    SavingsGoalOut,
)
from app.schemas.transfer import TransferCreate

router = APIRouter()


class TransactionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    transaction_date: str | None = None
    category_id: UUID | None = None
    amount: float | None = None
    account_id: UUID | None = None
    debt_id: UUID | None = None
    savings_goal_id: UUID | None = None


@router.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    return categories


@router.get("/accounts", response_model=List[AccountOut])
def get_accounts(db: Session = Depends(get_db)):
    accounts = db.query(Account).all()
    return accounts


@router.get("/savings-goals", response_model=List[SavingsGoalOut])
def get_savings_goals(db: Session = Depends(get_db)):
    savings_goals = db.query(SavingsGoal).all()
    return savings_goals


@router.post("/transfer", status_code=status.HTTP_201_CREATED)
def transfer(
    transfer_in: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id

    # Validate accounts belong to user
    from_account = (
        db.query(Account)
        .filter_by(id=str(transfer_in.from_account_id), user_id=user_id)
        .first()
    )
    to_account = (
        db.query(Account)
        .filter_by(id=str(transfer_in.to_account_id), user_id=user_id)
        .first()
    )

    if not from_account or not to_account:
        raise HTTPException(status_code=404, detail="One or both accounts not found.")

    if from_account.id == to_account.id:
        raise HTTPException(
            status_code=400, detail="Cannot transfer to the same account."
        )

    if from_account.current_balance < Decimal(str(transfer_in.amount)):
        raise HTTPException(
            status_code=400, detail="Insufficient funds in source account."
        )

    # Validate Category
    category = db.query(Category).filter_by(id=str(transfer_in.category_id)).first()
    if not category:
        raise HTTPException(status_code=400, detail="Category not found.")

    if category.type != "TRANSFER":
        raise HTTPException(
            status_code=400, detail="Category must be of type TRANSFER."
        )

    # Create Transactions
    # 1. Outgoing from Source
    tx_out = Transaction(
        user_id=user_id,
        name=f"Transfer to {to_account.name}",
        description=transfer_in.description,
        amount=-abs(Decimal(str(transfer_in.amount))),
        transaction_date=transfer_in.transaction_date,
        category_id=category.id,
        account_id=from_account.id,
    )

    # 2. Incoming to Destination
    tx_in = Transaction(
        user_id=user_id,
        name=f"Transfer from {from_account.name}",
        description=transfer_in.description,
        amount=abs(Decimal(str(transfer_in.amount))),
        transaction_date=transfer_in.transaction_date,
        category_id=category.id,
        account_id=to_account.id,
    )

    db.add(tx_out)
    db.add(tx_in)

    # Update Balances
    from_account.current_balance += tx_out.amount
    to_account.current_balance += tx_in.amount

    db.commit()

    return {"message": "Transfer successful"}


@router.get("", response_model=PaginationOut)
def get_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=100),
    search: str = Query("", description="Search term for name or description"),
    category_id: Optional[UUID] = None,
    account_id: Optional[UUID] = None,
    debt_id: Optional[UUID] = None,
    date: Optional[str] = Query(None, description="Date filter YYYY-MM-DD"),
    type: Optional[str] = Query(None, description="EXPENSE or INCOME"),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction)

    # Join for Category Type filtering if needed
    if type:
        query = query.join(Category).filter(Category.type == type)

    # Apply Filters
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Transaction.name.ilike(search_term))
            | (Transaction.description.ilike(search_term))
        )

    if category_id:
        query = query.filter(Transaction.category_id == str(category_id))

    if account_id:
        query = query.filter(Transaction.account_id == str(account_id))

    if debt_id:
        query = query.filter(Transaction.debt_id == str(debt_id))

    if date:
        from sqlalchemy import cast, Date

        query = query.filter(cast(Transaction.transaction_date, Date) == date)

    # Sorting
    query = query.order_by(Transaction.transaction_date.desc())

    # Pagination
    total_items = query.count()
    total_pages = (total_items + per_page - 1) // per_page

    transactions_db = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": transactions_db,
        "total": total_items,
        "page": page,
        "per_page": per_page,
        "pages": total_pages,
    }


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    txn_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id

    category = db.query(Category).filter_by(id=str(txn_in.category_id)).first()
    if not category:
        raise HTTPException(status_code=400, detail="Invalid category type.")

    if category.type == "EXPENSE":
        is_expense = True
        txn_in.amount = -abs(txn_in.amount)
    else:
        is_expense = False

    # Handle Debt Update
    if txn_in.debt_id:
        if not txn_in.person_id:
            raise HTTPException(
                status_code=400, detail="Person ID is required when linking a debt."
            )

        debt = db.query(Debt).filter_by(id=str(txn_in.debt_id)).first()
        if not debt:
            raise HTTPException(status_code=400, detail="Invalid debt ID.")

        # Check if person is part of the debt
        if str(txn_in.person_id) != str(debt.creditor_id) and str(
            txn_in.person_id
        ) != str(debt.debtor_id):
            raise HTTPException(
                status_code=400, detail="The person provided is not part of this debt."
            )

        # Logic to reduce debt
        should_permit_reduction = False

        # Case 1: Expense (User paying)
        if is_expense:
            should_permit_reduction = True
        # Case 2: Income (User receiving)
        else:
            if str(txn_in.person_id) == str(debt.creditor_id):
                should_permit_reduction = True

        if should_permit_reduction:
            payment_amount = abs(txn_in.amount)
            debt.remaining_amount -= Decimal(str(payment_amount))

            if debt.remaining_amount <= 0:
                debt.remaining_amount = 0
                debt.is_settled = True
            else:
                debt.is_settled = False

    # Create transaction
    new_txn = Transaction(
        user_id=user_id,
        name=txn_in.name,
        description=txn_in.description,
        amount=txn_in.amount,
        transaction_date=txn_in.transaction_date,
        category_id=str(txn_in.category_id) if txn_in.category_id else None,
        account_id=str(txn_in.account_id) if txn_in.account_id else None,
        debt_id=str(txn_in.debt_id) if txn_in.debt_id else None,
        savings_goal_id=str(txn_in.savings_goal_id) if txn_in.savings_goal_id else None,
    )
    db.add(new_txn)

    if new_txn.account_id:
        account = db.query(Account).filter_by(id=new_txn.account_id).first()
        if account:
            account.current_balance += Decimal(str(new_txn.amount))

    db.commit()
    db.refresh(new_txn)

    return new_txn


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(transaction_id: UUID, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter_by(id=str(transaction_id)).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return transaction


@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: UUID, txn_in: TransactionUpdate, db: Session = Depends(get_db)
):
    transaction = db.query(Transaction).filter_by(id=str(transaction_id)).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # --- UPDATE ACCOUNT BALANCE (PART 1: Revert old) ---
    old_account_id = transaction.account_id
    old_amount = transaction.amount

    if old_account_id:
        old_account = db.query(Account).filter_by(id=old_account_id).first()
        if old_account:
            old_account.current_balance -= old_amount

    # --- APPLY UPDATES ---
    if txn_in.name is not None:
        transaction.name = txn_in.name
    if txn_in.description is not None:
        transaction.description = txn_in.description
    if txn_in.transaction_date is not None:
        transaction.transaction_date = txn_in.transaction_date

    # Determine Category to check type
    if txn_in.category_id is not None:
        transaction.category_id = str(txn_in.category_id)
        category = db.query(Category).filter_by(id=transaction.category_id).first()
    else:
        category = transaction.category

    if not category:
        raise HTTPException(
            status_code=400, detail="Invalid category associated with transaction."
        )

    # Update Amount with correct sign based on Category Type
    if txn_in.amount is not None:
        raw_amount = Decimal(str(txn_in.amount))
        if category.type == "EXPENSE":
            transaction.amount = -abs(raw_amount)
        else:
            transaction.amount = abs(raw_amount)
    elif txn_in.category_id is not None:
        if category.type == "EXPENSE":
            transaction.amount = -abs(transaction.amount)
        else:
            transaction.amount = abs(transaction.amount)

    if txn_in.account_id is not None:
        transaction.account_id = str(txn_in.account_id)
    if txn_in.debt_id is not None:
        transaction.debt_id = str(txn_in.debt_id)
    if txn_in.savings_goal_id is not None:
        transaction.savings_goal_id = str(txn_in.savings_goal_id)

    # --- UPDATE ACCOUNT BALANCE (PART 2: Apply new) ---
    if transaction.account_id:
        new_account = db.query(Account).filter_by(id=transaction.account_id).first()
        if new_account:
            new_account.current_balance += transaction.amount

    db.commit()
    db.refresh(transaction)

    return transaction


@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: UUID, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter_by(id=str(transaction_id)).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    from datetime import datetime

    transaction.deleted_at = datetime.now()

    # --- UPDATE ACCOUNT BALANCE (Revert effect) ---
    if not transaction.deleted_at:
        if transaction.account_id:
            account = db.query(Account).filter_by(id=transaction.account_id).first()
            if account:
                account.current_balance -= Decimal(str(transaction.amount))

    db.commit()

    return {"message": "Transaction deleted successfully"}

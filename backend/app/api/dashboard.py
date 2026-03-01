from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, date, timedelta
from typing import Dict, Any, List

from app.core.database import get_db
# from app.core.context import get_current_user
from app.models.models import Transaction, Category, Account, User

router = APIRouter()

# Temporary mock dependency until context is refactored
def get_current_user(db: Session = Depends(get_db)):
    target_user_id = "5048520a-da77-4a94-b5e8-0376829ae095"
    user = db.query(User).filter(User.id == target_user_id).first()
    if not user:
        raise HTTPException(status_code=500, detail="No user found in context.")
    return user


@router.get("/summary", response_model=Dict[str, Any])
def get_dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    current_year = today.year
    current_month = today.month

    # Calculate dates for last month
    first_day_current_month = date(current_year, current_month, 1)
    last_month_end = first_day_current_month - timedelta(days=1)
    last_month_year = last_month_end.year
    last_month_month = last_month_end.month

    # 1. Balance (Sum of all accounts)
    total_balance = db.query(func.sum(Account.current_balance)).filter(Account.user_id == current_user.id).scalar() or 0

    # 2. Current Month Income vs Expenses
    current_month_transactions = db.query(
        Transaction.amount, 
        Category.type,
        Transaction.transaction_date
    ).join(Category).filter(
        Transaction.user_id == current_user.id,
        extract('year', Transaction.transaction_date) == current_year,
        extract('month', Transaction.transaction_date) == current_month
    ).all()

    current_income = sum(t.amount for t in current_month_transactions if t.type == 'INCOME')
    current_expenses = sum(abs(t.amount) for t in current_month_transactions if t.type == 'EXPENSE')

    # 3. Last Month Income vs Expenses
    last_month_transactions = db.query(
        Transaction.amount, 
        Category.type
    ).join(Category).filter(
        Transaction.user_id == current_user.id,
        extract('year', Transaction.transaction_date) == last_month_year,
        extract('month', Transaction.transaction_date) == last_month_month
    ).all()

    last_month_income = sum(t.amount for t in last_month_transactions if t.type == 'INCOME')
    last_month_expenses = sum(abs(t.amount) for t in last_month_transactions if t.type == 'EXPENSE')

    # 4. Chart Data (Daily breakdown for current month)
    chart_data = {}
    import calendar
    _, num_days = calendar.monthrange(current_year, current_month)
    for day in range(1, num_days + 1):
        chart_data[day] = {"day": day, "income": 0, "expenses": 0}

    for t in current_month_transactions:
        day = t.transaction_date.day
        val = abs(t.amount)
        if t.type == 'INCOME':
            chart_data[day]["income"] += float(val)
        elif t.type == 'EXPENSE':
            chart_data[day]["expenses"] += float(val)

    sorted_chart_data = [chart_data[d] for d in sorted(chart_data.keys())]

    return {
        "current_date": {
            "year": current_year,
            "month": today.strftime("%B"),
            "month_int": current_month
        },
        "cards": {
            "balance": float(total_balance),
            "income": float(current_income),
            "expenses": float(current_expenses)
        },
        "month_comparison": {
            "current": {
                "income": float(current_income),
                "expenses": float(current_expenses)
            },
            "last": {
                "income": float(last_month_income),
                "expenses": float(last_month_expenses)
            }
        },
        "chart_data": sorted_chart_data
    }

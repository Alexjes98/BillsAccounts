from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Dict, Any, Optional
from datetime import datetime
import calendar

from app.core.database import get_db
# from app.core.context import get_current_user
from app.models.models import MonthlySummary, Transaction, Category, User

router = APIRouter()

# Temporary mock dependency until context is refactored
def get_current_user(db: Session = Depends(get_db)):
    target_user_id = "5048520a-da77-4a94-b5e8-0376829ae095"
    user = db.query(User).filter(User.id == target_user_id).first()
    if not user:
        raise HTTPException(status_code=500, detail="No user found in context.")
    return user


@router.get("/", response_model=List[Dict[str, Any]])
def get_monthly_summaries(
    year: Optional[int] = Query(None, description="Year to get summaries for"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not year:
        year = datetime.now().year

    summaries = db.query(MonthlySummary).filter(
        MonthlySummary.user_id == current_user.id,
        MonthlySummary.year == year
    ).order_by(MonthlySummary.month).all()
    
    result = []
    for summary in summaries:
        result.append({
            "id": summary.id,
            "year": summary.year,
            "month": summary.month,
            "month_name": calendar.month_name[summary.month],
            "total_income": float(summary.total_income or 0),
            "total_expense": float(summary.total_expense or 0),
            "closing_balance": float(summary.closing_balance or 0)
        })
    return result

@router.post("/recalculate")
def recalculate_summaries(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    
    # Refined Aggregation with User ID
    aggregated_data_users = db.query(
        Transaction.user_id,
        extract('year', Transaction.transaction_date).label('year'),
        extract('month', Transaction.transaction_date).label('month'),
        Category.type,
        func.sum(Transaction.amount).label('total')
    ).join(Category, Transaction.category_id == Category.id)\
     .filter(Transaction.deleted_at.is_(None), Transaction.user_id == user_id)\
     .group_by(
         Transaction.user_id,
         extract('year', Transaction.transaction_date),
         extract('month', Transaction.transaction_date),
         Category.type
     ).all()
     
    user_summary_map = {}
    for uid, year, month, cat_type, total in aggregated_data_users:
        if uid not in user_summary_map:
            user_summary_map[uid] = {}
        
        key = (int(year), int(month))
        if key not in user_summary_map[uid]:
            user_summary_map[uid][key] = {'income': 0, 'expense': 0}
            
        if cat_type == 'INCOME':
            user_summary_map[uid][key]['income'] += float(total)
        elif cat_type == 'EXPENSE':
            user_summary_map[uid][key]['expense'] += float(total)
            
    # Now update database
    try:
        # Clear summaries for this user
        db.query(MonthlySummary).filter(MonthlySummary.user_id == user_id).delete()
        
        new_records = []
        
        for u_id, data in user_summary_map.items():
            running_balance = 0.0
            sorted_months = sorted(data.keys()) # sort by (year, month)
            
            for key in sorted_months:
                year, month = key
                vals = data[key]
                income = vals['income']
                expense = vals['expense']
                net = income - expense
                running_balance += net
                
                summary = MonthlySummary(
                    user_id=u_id,
                    year=year,
                    month=month,
                    total_income=income,
                    total_expense=expense,
                    closing_balance=running_balance
                )
                new_records.append(summary)
        
        db.add_all(new_records)
        db.commit()
        return {"message": "Recalculation complete", "count": len(new_records)}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recalculate/{year}/{month}")
def recalculate_single_month(year: int, month: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id

    try:
        # 1. Aggregate transactions for this specific month
        aggregated = db.query(
            Category.type,
            func.sum(Transaction.amount)
        ).join(Category, Transaction.category_id == Category.id)\
         .filter(
             Transaction.user_id == user_id,
             Transaction.deleted_at.is_(None),
             extract('year', Transaction.transaction_date) == year,
             extract('month', Transaction.transaction_date) == month
         ).group_by(Category.type).all()
         
        income = 0.0
        expense = 0.0
        for cat_type, total in aggregated:
            if cat_type == 'INCOME':
                income = float(total)
            elif cat_type == 'EXPENSE':
                expense = float(total)

        # 2. Get Previous Month's Closing Balance
        prev_year = year
        prev_month = month - 1
        if prev_month == 0:
            prev_month = 12
            prev_year = year - 1
            
        prev_summary = db.query(MonthlySummary).filter(
            MonthlySummary.user_id == user_id,
            MonthlySummary.year == prev_year,
            MonthlySummary.month == prev_month
        ).first()
        
        prev_balance = prev_summary.closing_balance if prev_summary else 0.0
        
        current_balance = prev_balance + income - expense

        # 3. Update or Create Summary
        summary = db.query(MonthlySummary).filter(
            MonthlySummary.user_id == user_id,
            MonthlySummary.year == year,
            MonthlySummary.month == month
        ).first()

        if summary:
            summary.total_income = abs(income)
            summary.total_expense = abs(expense)
            summary.closing_balance = current_balance
        else:
            summary = MonthlySummary(
                user_id=user_id,
                year=year,
                month=month,
                total_income=abs(income),
                total_expense=abs(expense),
                closing_balance=current_balance
            )
            db.add(summary)
            
        db.commit()
        return {
            "message": f"Summary for {year}-{month} updated",
            "data": {
                "year": year,
                "month": month,
                "income": income,
                "expense": expense,
                "closing_balance": current_balance
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
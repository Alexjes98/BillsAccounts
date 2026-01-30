from flask import Blueprint, request, jsonify, g
from app.core.database import get_db
from app.models.models import MonthlySummary, Transaction, Category
from sqlalchemy import func, extract, and_
from sqlalchemy.orm import Session
from datetime import datetime
import calendar

monthly_summaries_bp = Blueprint("monthly_summaries", __name__)

@monthly_summaries_bp.route("/", methods=["GET"])
def get_monthly_summaries():
    year = request.args.get("year", type=int)
    if not year:
        year = datetime.now().year
    db: Session = next(get_db())
    
    user_id = g.user.id if g.user else None
    if not user_id:
        return jsonify({"error": "No user in context"}), 500

    summaries = db.query(MonthlySummary).filter(
        MonthlySummary.user_id == user_id,
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
    return jsonify(result)

@monthly_summaries_bp.route("/recalculate", methods=["POST"])
def recalculate_summaries():
    db: Session = next(get_db())
    user_id = g.user.id if g.user else None
    if not user_id:
        return jsonify({"error": "No user in context"}), 500
    
    # Group transactions by user, year, month - Restricted to Current User
    
    # Group transactions by user, year, month
    
    # Step 1: Query aggregated data
    # We need: Year, Month, Sum(Income), Sum(Expense)
    
    aggregated_data = db.query(
        extract('year', Transaction.transaction_date).label('year'),
        extract('month', Transaction.transaction_date).label('month'),
        Category.type,
        func.sum(Transaction.amount).label('total')
    ).join(Category, Transaction.category_id == Category.id)\
     .filter(Transaction.deleted_at.is_(None))\
     .group_by(
         extract('year', Transaction.transaction_date),
         extract('month', Transaction.transaction_date),
         Category.type
     ).all()
    # Process data into a dictionary structure
    # { (year, month): { 'income': 0, 'expense': 0 } }
    summary_map = {}
    
    for year, month, cat_type, total in aggregated_data:
        key = (int(year), int(month))
        if key not in summary_map:
            summary_map[key] = {'income': 0, 'expense': 0}
        
        if cat_type == 'INCOME':
            summary_map[key]['income'] += float(total)
        elif cat_type == 'EXPENSE':
            summary_map[key]['expense'] += float(total)
    # Now we need to calculate closing balances. 
    # This requires ordering by time.
    
    sorted_keys = sorted(summary_map.keys())
    
    # We need to handle the running balance.
    # Running balance = previous_balance + income - expense
    # Note: This recalculation assumes we are rebuilding the history.
    # Does the current balance start from 0? Or do we need an initial balance?
    # Accounts have `current_balance`.
    # `closing_balance` in `MonthlySummary` usually tracks the flow over time.
    # I will assume it starts from 0 for the very first month found.
    
    running_balance = 0.0
    
    # We should delete existing summaries to avoid duplicates/stale data
    # Or strict upsert. Deleting all for the user is cleaner for "recalculate"
    # But wait, I need the user_id for the summaries.
    # The aggregation didn't group by user_id. I should add user_id to aggregation.
    
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
    # { user_id: { (year, month): {'income': ..., 'expense': ... } } }
    for uid, year, month, cat_type, total in aggregated_data_users:
        # uid should match user_id
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
        
        for user_id, data in user_summary_map.items():
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
                    user_id=user_id,
                    year=year,
                    month=month,
                    total_income=income,
                    total_expense=expense,
                    closing_balance=running_balance
                )
                new_records.append(summary)
        
        db.add_all(new_records)
        db.commit()
        return jsonify({"message": "Recalculation complete", "count": len(new_records)})
        
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500

@monthly_summaries_bp.route("/recalculate/<int:year>/<int:month>", methods=["POST"])
def recalculate_single_month(year, month):
    db: Session = next(get_db())
    user_id = g.user.id if g.user else None
    if not user_id:
        return jsonify({"error": "No user in context"}), 500

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
         
        print("aggregated", aggregated)

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
        return jsonify({
            "message": f"Summary for {year}-{month} updated",
            "data": {
                "year": year,
                "month": month,
                "income": income,
                "expense": expense,
                "closing_balance": current_balance
            }
        })

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
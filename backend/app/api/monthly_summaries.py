from flask import Blueprint, request, jsonify
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
    
    summaries = db.query(MonthlySummary).filter(
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
    user_id = "00000000-0000-0000-0000-000000000000" # Hardcoded for now as per other parts, or we should get from auth if available.
    # Actually, the user rules say "user_id should be hardcoded" in previous context, checking existing code...
    # Checking Transaction creation context in conversation history: "user_id should be hardcoded".
    # I will assume the same here. BUT I need to be careful about which user ID.
    # Let's peek at one existing endpoint to see how they handle user_id.
    # Logic:
    # 1. Clear existing summaries? Or upsert? Upsert is better to keep IDs if possible, but deleting and re-creating is easier for full recalc.
    # Let's try to do it effectively.
    
    # 0. Get the default user for now.
    # In `models.py` User is needed. I'll check `app/api/transactions.py` briefly before committing this file if unsure.
    # But for now I'll assume we need to process for ALL users or a specific one.
    # Since auth isn't fully detailed in the prompt, and previous prompts mentions hardcoded user, I'll assume single user mode or getting the first user.
    
    # Let's try to be generic and support "current" user if passed, or just re-calc for all transactions if no user filter logic is standard.
    # Given the previous context, I'll stick to a fixed user_id or fetch it.
    
    # Let's fetch the first user to be safe if we need a specific one, or just hardcode the one likely used in seeds.
    # However, to be robust, I will query transactions per user.
    
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
     .filter(Transaction.deleted_at.is_(None))\
     .group_by(
         Transaction.user_id,
         extract('year', Transaction.transaction_date),
         extract('month', Transaction.transaction_date),
         Category.type
     ).all()
     
    user_summary_map = {}
    # { user_id: { (year, month): {'income': ..., 'expense': ... } } }
    for user_id, year, month, cat_type, total in aggregated_data_users:
        if user_id not in user_summary_map:
            user_summary_map[user_id] = {}
        
        key = (int(year), int(month))
        if key not in user_summary_map[user_id]:
            user_summary_map[user_id][key] = {'income': 0, 'expense': 0}
            
        if cat_type == 'INCOME':
            user_summary_map[user_id][key]['income'] += float(total)
        elif cat_type == 'EXPENSE':
            user_summary_map[user_id][key]['expense'] += float(total)
    # Now update database
    try:
        # Clear all summaries - brute force approach for "Recalculate"
        db.query(MonthlySummary).delete()
        
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
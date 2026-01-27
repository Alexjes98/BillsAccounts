from flask import Blueprint, jsonify
from sqlalchemy import func, extract, and_
from datetime import datetime, date, timedelta
from app.core.database import SessionLocal
from app.models.models import Transaction, Category, Account, User

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/summary', methods=['GET'])
def get_dashboard_summary():
    session = SessionLocal()
    try:
        # Get current user (hardcoded for now as per other endpoints)
        user = session.query(User).first()
        if not user:
            return jsonify({"error": "No user found"}), 404

        today = date.today()
        current_year = today.year
        current_month = today.month

        # Calculate dates for last month
        first_day_current_month = date(current_year, current_month, 1)
        last_month_end = first_day_current_month - timedelta(days=1)
        last_month_year = last_month_end.year
        last_month_month = last_month_end.month

        # 1. Balance (Sum of all accounts)
        total_balance = session.query(func.sum(Account.current_balance)).filter(Account.user_id == user.id).scalar() or 0

        # 2. Current Month Income vs Expenses
        # We need to join with Category to get the type
        
        current_month_transactions = session.query(
            Transaction.amount, 
            Category.type,
            Transaction.transaction_date
        ).join(Category).filter(
            Transaction.user_id == user.id,
            extract('year', Transaction.transaction_date) == current_year,
            extract('month', Transaction.transaction_date) == current_month
        ).all()

        current_income = sum(t.amount for t in current_month_transactions if t.type == 'INCOME')
        current_expenses = sum(abs(t.amount) for t in current_month_transactions if t.type == 'EXPENSE')

        # 3. Last Month Income vs Expenses
        last_month_transactions = session.query(
            Transaction.amount, 
            Category.type
        ).join(Category).filter(
            Transaction.user_id == user.id,
            extract('year', Transaction.transaction_date) == last_month_year,
            extract('month', Transaction.transaction_date) == last_month_month
        ).all()

        last_month_income = sum(t.amount for t in last_month_transactions if t.type == 'INCOME')
        last_month_expenses = sum(abs(t.amount) for t in last_month_transactions if t.type == 'EXPENSE')

        # 4. Chart Data (Daily breakdown for current month)
        # We want to show accumulated income/expenses or daily? "Actual month income against expenses"
        # Let's do daily totals for the chart.
        
        chart_data = {}
        # Initialize all days in month
        import calendar
        _, num_days = calendar.monthrange(current_year, current_month)
        for day in range(1, num_days + 1):
            chart_data[day] = {"day": day, "income": 0, "expenses": 0}

        for t in current_month_transactions:
            # t.transaction_date can be datetime or date. Assuming datetime from model.
            if isinstance(t.transaction_date, datetime):
                day = t.transaction_date.day
            else:
                day = t.transaction_date.day
            
            val = abs(t.amount)
            if t.type == 'INCOME':
                chart_data[day]["income"] += float(val)
            elif t.type == 'EXPENSE':
                chart_data[day]["expenses"] += float(val)

        sorted_chart_data = [chart_data[d] for d in sorted(chart_data.keys())]

        return jsonify({
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
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

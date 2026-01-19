from app.schemas.transaction import FreeModeData, TransactionBase
from collections import defaultdict

class FreeService:
    @staticmethod
    def process_file_content(json_content: dict) -> dict:
        """
        Validates and processes the JSON content for Free Mode.
        Returns calculated stats.
        """
        # 1. Validate with Pydantic
        data = FreeModeData(**json_content)
        
        # 2. Calculate Stats
        total_balance = 0.0
        income = 0.0
        expenses = 0.0
        category_breakdown = defaultdict(float)
        
        for tx in data.transactions:
            amount = tx.amount
            category = tx.category
            
            # Simple assumption: positive = income, negative = expense, or use category
            # For this MVP, let's assume signed amounts
            total_balance += amount
            if amount > 0:
                income += amount
            else:
                expenses += abs(amount)
            
            category_breakdown[category] += amount

        return {
            "summary": {
                "balance": total_balance,
                "total_income": income,
                "total_expenses": expenses
            },
            "category_breakdown": dict(category_breakdown),
            "transaction_count": len(data.transactions)
        }

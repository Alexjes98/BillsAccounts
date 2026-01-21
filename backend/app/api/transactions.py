from flask import Blueprint, request, jsonify
from app.core.database import SessionLocal
from app.models.models import Transaction
from app.schemas.transaction import TransactionOut

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('/', methods=['GET', 'POST'])
def transactions():
    if request.method == 'GET':
        session = SessionLocal()
        try:
            # Query transactions with relationships
            transactions_db = session.query(Transaction).order_by(Transaction.transaction_date.desc()).all()
            
            results = [TransactionOut.model_validate(t).model_dump(mode='json') for t in transactions_db]
            return jsonify(results)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            session.close()

    # Placeholder for POST
    return jsonify({"message": "Create transaction feature coming soon"}), 501

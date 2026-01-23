from flask import Blueprint, request, jsonify
from app.core.database import SessionLocal
from app.models.models import Transaction, Category, User, Account, Debt, SavingsGoal
from app.schemas.transaction import TransactionOut, TransactionCreate, CategoryOut, AccountOut, DebtOut, SavingsGoalOut

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('/categories', methods=['GET'])
def get_categories():
    session = SessionLocal()
    try:
        categories = session.query(Category).all()
        return jsonify([CategoryOut.model_validate(c).model_dump(mode='json') for c in categories])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@transactions_bp.route('/accounts', methods=['GET'])
def get_accounts():
    session = SessionLocal()
    try:
        accounts = session.query(Account).all()
        return jsonify([AccountOut.model_validate(a).model_dump(mode='json') for a in accounts])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
        



@transactions_bp.route('/savings-goals', methods=['GET'])
def get_savings_goals():
    session = SessionLocal()
    try:
        savings_goals = session.query(SavingsGoal).all()
        return jsonify([SavingsGoalOut.model_validate(g).model_dump(mode='json') for g in savings_goals])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@transactions_bp.route('/', methods=['GET', 'POST'], strict_slashes=False)
def transactions():
    session = SessionLocal()
    try:
        if request.method == 'GET':
            # Query transactions with relationships
            transactions_db = session.query(Transaction).order_by(Transaction.transaction_date.desc()).all()
            
            results = [TransactionOut.model_validate(t).model_dump(mode='json') for t in transactions_db]
            return jsonify(results)
        
        elif request.method == 'POST':
            data = request.json
            # Validate input using Pydantic
            try:
                txn_data = TransactionCreate(**data)
            except Exception as e:
                return jsonify({"error": f"Validation error: {e}"}), 400

            # Find default user (Hardcoded context)
            user = session.query(User).first()
            if not user:
                 return jsonify({"error": "No user found in database to attach transaction to."}), 500
             
            category = session.query(Category).filter_by(id=txn_data.category_id).first()
            if not category:
                return jsonify({"error": "Invalid category type."}), 400
            
            if category.type == "EXPENSE":
                txn_data.amount = -txn_data.amount
            
            # Create transaction
            new_txn = Transaction(
                user_id=user.id,
                name=txn_data.name,
                description=txn_data.description,
                amount=txn_data.amount,
                transaction_date=txn_data.transaction_date,
                category_id=txn_data.category_id,
                account_id=txn_data.account_id,
                debt_id=txn_data.debt_id,
                savings_goal_id=txn_data.savings_goal_id
            )
            session.add(new_txn)
            session.commit()
            session.refresh(new_txn)
            
            return jsonify(TransactionOut.model_validate(new_txn).model_dump(mode='json')), 201

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

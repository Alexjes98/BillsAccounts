from flask import Blueprint, jsonify, request, g
from app.core.database import SessionLocal
from app.models.models import Account, Transaction, User
from app.schemas.account import AccountOut

accounts_bp = Blueprint('accounts', __name__)

@accounts_bp.route('/', methods=['GET'], strict_slashes=False)
def get_accounts():
    session = SessionLocal()
    try:
        user = g.user
        if not user:
            return jsonify({"error": "No user found in context."}), 500
        accounts = session.query(Account).filter_by(user_id=user.id).all()
        return jsonify([AccountOut.model_validate(a).model_dump(mode='json') for a in accounts])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@accounts_bp.route('/', methods=['POST'], strict_slashes=False)
def create_account():
    session = SessionLocal()
    try:
        data = request.json
        if not data.get('name') or not data.get('type'):
            return jsonify({"error": "Name and type are required"}), 400
            
        user = g.user
        if not user:
             return jsonify({"error": "No user found in context"}), 500

        new_account = Account(
            user_id=user.id,
            name=data['name'],
            type=data['type'],
            current_balance=data.get('current_balance', 0),
            currency=data.get('currency', 'USD')
        )
        session.add(new_account)
        session.commit()
        session.refresh(new_account)
        return jsonify(AccountOut.model_validate(new_account).model_dump(mode='json')), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@accounts_bp.route('/<uuid:account_id>', methods=['PUT'], strict_slashes=False)
def update_account(account_id):
    session = SessionLocal()
    try:
        account = session.query(Account).filter(Account.id == account_id).first()
        if not account:
            return jsonify({"error": "Account not found"}), 404
            
        data = request.json
        if 'name' in data:
            account.name = data['name']
        if 'type' in data:
            account.type = data['type']
            
        session.commit()
        session.refresh(account)
        return jsonify(AccountOut.model_validate(account).model_dump(mode='json'))
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@accounts_bp.route('/<uuid:account_id>', methods=['DELETE'], strict_slashes=False)
def delete_account(account_id):
    session = SessionLocal()
    try:
        account = session.query(Account).filter(Account.id == account_id).first()
        if not account:
            return jsonify({"error": "Account not found"}), 404
            
        session.query(Transaction).filter(Transaction.account_id == account_id).delete()
        session.delete(account)
        
        session.commit()
        return jsonify({"message": "Account and associated transactions deleted successfully"})
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

from flask import Blueprint, jsonify, request, g
from app.core.database import SessionLocal
from app.models.models import Debt
from app.schemas.transaction import DebtOut
from sqlalchemy import func

debts_bp = Blueprint('debts', __name__)

@debts_bp.route('/', methods=['GET', 'POST'], strict_slashes=False)
def handle_debts():
    session = SessionLocal()
    try:
        if request.method == 'GET':
            debts = session.query(Debt).filter(Debt.deleted_at.is_(None)).all()
            return jsonify([DebtOut.model_validate(d).model_dump(mode='json') for d in debts])
        
        elif request.method == 'POST':
            data = request.json
            try:
                from app.schemas.transaction import DebtCreate
                debt_data = DebtCreate(**data)
            except Exception as e:
                return jsonify({"error": f"Validation error: {e}"}), 400

            # Find default user
            # Get user from AppContext
            from app.models.models import User
            user = g.user
            if not user:
                 return jsonify({"error": "No user found in context."}), 500

            new_debt = Debt(
                user_id=user.id,
                creditor_id=debt_data.creditor_id,
                debtor_id=debt_data.debtor_id,
                total_amount=debt_data.total_amount,
                remaining_amount=debt_data.total_amount, # Initially same as total
                description=debt_data.description,
                due_date=debt_data.due_date
            )
            
            session.add(new_debt)
            session.commit()
            session.refresh(new_debt)
            
            return jsonify(DebtOut.model_validate(new_debt).model_dump(mode='json')), 201
            
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@debts_bp.route('/<uuid:debt_id>', methods=['PUT', 'DELETE'], strict_slashes=False)
def handle_single_debt(debt_id):
    session = SessionLocal()
    try:
        debt = session.query(Debt).filter(Debt.id == debt_id, Debt.deleted_at.is_(None)).first()
        if not debt:
            return jsonify({"error": "Debt not found"}), 404

        if request.method == 'PUT':
            data = request.json
            
            # Update fields if present
            if 'description' in data:
                debt.description = data['description']
            if 'due_date' in data:
                debt.due_date = data['due_date']
            if 'is_settled' in data:
                debt.is_settled = data['is_settled']
                if debt.is_settled:
                    debt.remaining_amount = 0
                else:
                    # If un-settling, what should be the remaining amount?
                    # Ideally we should track payments, but for now we might reset to total or keep as is?
                    # The requirement says "Mark debt as settled", implies one way mostly.
                    # If un-settling, we probably shouldn't auto-reset unless we know the history.
                    # For safety, let's only auto-zero if settling.
                    pass

            session.commit()
            session.refresh(debt)
            return jsonify(DebtOut.model_validate(debt).model_dump(mode='json'))

        elif request.method == 'DELETE':
            from datetime import datetime
            debt.deleted_at = datetime.utcnow()
            session.commit()
            return jsonify({"message": "Debt deleted successfully"}), 200

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@debts_bp.route('/summary', methods=['GET'])
def get_debts_summary():
    session = SessionLocal()
    try:
        from app.models.models import Person
        from sqlalchemy.orm import aliased
        
        Creditor = aliased(Person)
        Debtor = aliased(Person)
        
        results = session.query(
            Creditor.name.label('creditor_name'),
            Debtor.name.label('debtor_name'),
            func.count(Debt.id).label('count'),
            func.sum(Debt.total_amount).label('total_amount'),
            # Include IDs in select or at least group by them to avoid ambiguity and GroupingError if strict
            Debt.creditor_id,
            Debt.debtor_id
        ).join(Creditor, Debt.creditor_id == Creditor.id)\
         .join(Debtor, Debt.debtor_id == Debtor.id)\
         .group_by(Debt.creditor_id, Debt.debtor_id, Creditor.name, Debtor.name).all()

        summary_data = []
        for row in results:
            summary_data.append({
                "creditor_name": row.creditor_name,
                "debtor_name": row.debtor_name,
                "count": row.count,
                "total_amount": float(row.total_amount) if row.total_amount else 0
            })
            
        return jsonify(summary_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

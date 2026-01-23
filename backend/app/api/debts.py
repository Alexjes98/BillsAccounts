from flask import Blueprint, jsonify, request
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
            debts = session.query(Debt).all()
            return jsonify([DebtOut.model_validate(d).model_dump(mode='json') for d in debts])
        
        elif request.method == 'POST':
            data = request.json
            try:
                from app.schemas.transaction import DebtCreate
                debt_data = DebtCreate(**data)
            except Exception as e:
                return jsonify({"error": f"Validation error: {e}"}), 400

            # Find default user
            from app.models.models import User
            user = session.query(User).first()
            if not user:
                 return jsonify({"error": "No user found in database."}), 500

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

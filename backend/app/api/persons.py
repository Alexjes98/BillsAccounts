from flask import Blueprint, request, jsonify, g
from app.core.database import SessionLocal
from app.models.models import Person, User
from app.schemas.person import PersonOut, PersonCreate

persons_bp = Blueprint('persons', __name__)

@persons_bp.route('/', methods=['GET', 'POST'], strict_slashes=False)
def handle_persons():
    session = SessionLocal()
    try:
        if request.method == 'GET':
            if not g.user:
                 return jsonify({"error": "No user found in context."}), 500
            user = g.user
            
            query = session.query(Person)
            if user.person_id:
                query = query.filter(Person.id != user.person_id)
            
            persons = query.all()
            return jsonify([PersonOut.model_validate(p).model_dump(mode='json') for p in persons])
        
        elif request.method == 'POST':
            data = request.json
            try:
                person_data = PersonCreate(**data)
            except Exception as e:
                return jsonify({"error": f"Validation error: {e}"}), 400
            
            # Find default user (Hardcoded context)
            # Get user from AppContext
            if not g.user:
                 return jsonify({"error": "No user found in context."}), 500
            user = g.user
            
            # Check for duplicates if needed (UniqueConstraint('user_id', 'name'))
            existing = session.query(Person).filter_by(user_id=user.id, name=person_data.name).first()
            if existing:
                return jsonify({"error": "Person with this name already exists."}), 400

            new_person = Person(
                user_id=user.id,
                name=person_data.name,
                contact_info=person_data.contact_info
            )
            session.add(new_person)
            session.commit()
            session.refresh(new_person)
            
            return jsonify(PersonOut.model_validate(new_person).model_dump(mode='json')), 201

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@persons_bp.route('/<uuid:person_id>', methods=['PUT'], strict_slashes=False)
def update_person(person_id):
    session = SessionLocal()
    try:
        data = request.json
        try:
            person_data = PersonCreate(**data)
        except Exception as e:
            return jsonify({"error": f"Validation error: {e}"}), 400

        if not g.user:
            return jsonify({"error": "No user found in context."}), 500
        user = g.user

        person = session.query(Person).filter_by(id=person_id, user_id=user.id).first()
        if not person:
            return jsonify({"error": "Person not found"}), 404

        # Check for name uniqueness if name is changed
        if person.name != person_data.name:
            existing = session.query(Person).filter_by(user_id=user.id, name=person_data.name).first()
            if existing:
                return jsonify({"error": "Person with this name already exists."}), 400

        person.name = person_data.name
        person.contact_info = person_data.contact_info
        
        session.commit()
        session.refresh(person)
        return jsonify(PersonOut.model_validate(person).model_dump(mode='json')), 200

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@persons_bp.route('/<uuid:person_id>', methods=['DELETE'], strict_slashes=False)
def delete_person(person_id):
    session = SessionLocal()
    try:
        if not g.user:
            return jsonify({"error": "No user found in context."}), 500
        user = g.user

        person = session.query(Person).filter_by(id=person_id, user_id=user.id).first()
        if not person:
            return jsonify({"error": "Person not found"}), 404
        
        # Check if trying to delete self
        if user.person_id and str(person.id) == str(user.person_id):
            return jsonify({"error": "Cannot delete your own person entity."}), 400

        # Check for existing debts
        if person.debts_as_creditor or person.debts_as_debtor:
             return jsonify({"error": "Cannot delete person associated with existing debts."}), 400

        session.delete(person)
        session.commit()
        return jsonify({"message": "Person deleted successfully"}), 200

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

from flask import Blueprint, request, jsonify
from app.core.database import SessionLocal
from app.models.models import Person, User
from app.schemas.person import PersonOut, PersonCreate

persons_bp = Blueprint('persons', __name__)

@persons_bp.route('/', methods=['GET', 'POST'], strict_slashes=False)
def handle_persons():
    session = SessionLocal()
    try:
        if request.method == 'GET':
            persons = session.query(Person).all()
            return jsonify([PersonOut.model_validate(p).model_dump(mode='json') for p in persons])
        
        elif request.method == 'POST':
            data = request.json
            try:
                person_data = PersonCreate(**data)
            except Exception as e:
                return jsonify({"error": f"Validation error: {e}"}), 400
            
            # Find default user (Hardcoded context)
            user = session.query(User).first()
            if not user:
                 return jsonify({"error": "No user found in database to attach person to."}), 500
            
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

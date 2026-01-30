from flask import Blueprint, request, jsonify, g
from app.core.database import SessionLocal
from app.models.models import Category, User
from app.schemas.category import CategoryCreate, CategoryOut

categories_bp = Blueprint('categories', __name__)

@categories_bp.route('/', methods=['GET'], strict_slashes=False)
def get_categories():
    session = SessionLocal()
    try:
        user = g.user
        if not user:
            return jsonify({"error": "No user found in context."}), 500
        categories = session.query(Category).filter_by(user_id=user.id).all()
        return jsonify([CategoryOut.model_validate(c).model_dump(mode='json') for c in categories])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@categories_bp.route('/', methods=['POST'], strict_slashes=False)
def create_category():
    session = SessionLocal()
    try:
        data = request.json
        try:
            cat_data = CategoryCreate(**data)
        except Exception as e:
            return jsonify({"error": f"Validation error: {e}"}), 400

        user = g.user
        if not user:
            return jsonify({"error": "No user found in context."}), 500
        
        existing = session.query(Category).filter_by(user_id=user.id, name=cat_data.name, type=cat_data.type).first()
        if existing:
             return jsonify({"error": "Category already exists."}), 409

        new_category = Category(
            user_id=user.id,
            name=cat_data.name,
            icon=cat_data.icon,
            color=cat_data.color,
            type=cat_data.type
        )
        session.add(new_category)
        session.commit()
        session.refresh(new_category)
        
        return jsonify(CategoryOut.model_validate(new_category).model_dump(mode='json')), 201

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

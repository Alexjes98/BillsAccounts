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

@categories_bp.route('/<uuid:category_id>', methods=['PUT'], strict_slashes=False)
def update_category(category_id):
    session = SessionLocal()
    try:
        user = g.user
        if not user:
            return jsonify({"error": "No user found in context."}), 500
            
        category = session.query(Category).filter_by(id=category_id, user_id=user.id).first()
        if not category:
            return jsonify({"error": "Category not found."}), 404

        data = request.json
        if 'name' in data:
            category.name = data['name']
        if 'icon' in data:
            category.icon = data['icon']
        if 'color' in data:
            category.color = data['color']
            
        session.commit()
        session.refresh(category)
        return jsonify(CategoryOut.model_validate(category).model_dump(mode='json'))

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@categories_bp.route('/<uuid:category_id>', methods=['DELETE'], strict_slashes=False)
def delete_category(category_id):
    session = SessionLocal()
    try:
        user = g.user
        if not user:
            return jsonify({"error": "No user found in context."}), 500

        category = session.query(Category).filter_by(id=category_id, user_id=user.id).first()
        if not category:
            return jsonify({"error": "Category not found."}), 404

        from app.models.models import Transaction
        tx_count = session.query(Transaction).filter_by(category_id=category_id).count()
        
        if tx_count > 0:
            return jsonify({"error": "Cannot delete category because it is used in transactions."}), 409

        session.delete(category)
        session.commit()
        return jsonify({"message": "Category deleted successfully."})

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

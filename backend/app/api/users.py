from flask import Blueprint, jsonify, g
from app.schemas.user import UserOut

users_bp = Blueprint('users', __name__)

@users_bp.route('/me', methods=['GET'])
def get_current_user():
    user = g.get('user')
    if not user:
        return jsonify({"error": "User not found within context"}), 404
        
    return jsonify(UserOut.model_validate(user).model_dump(mode='json'))

from flask import g, request, current_app, jsonify
from app.core.database import SessionLocal
from app.models.models import User
import logging

def get_current_user():
    """Type-safe retrieval of current user"""
    return g.get("user")

def get_current_user_id():
    """Type-safe retrieval of current user id"""
    user = get_current_user()
    if user:
        return user.id
    return None

def setup_app_context(app):
    @app.before_request
    def load_user():
        # Hardcoded ID as requested by the user
        target_user_id = "5048520a-da77-4a94-b5e8-0376829ae095"
        
        # Create a session for this request context
        session = SessionLocal()
        g._context_session = session
        
        try:
            user = session.query(User).filter(User.id == target_user_id).first()
            if user:
                g.user = user
                # We also store the ID directly for convenience
                g.user_id = user.id
            else:
                logging.warning(f"Hardcoded user {target_user_id} not found in database.")
                g.user = None
                g.user_id = None
        except Exception as e:
            logging.error(f"Error loading user in app context: {e}")
            g.user = None
            g.user_id = None

    @app.teardown_request
    def cleanup_context(exception=None):
        session = g.pop('_context_session', None)
        if session:
            session.close()

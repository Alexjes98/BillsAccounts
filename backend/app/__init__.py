from flask import Flask
from flask_cors import CORS
from app.core.config import settings

from app.api.routes import main_bp
from app.api.transactions import transactions_bp

def create_app() -> Flask:
    app = Flask(__name__)
    
    # Configuration
    app.config["SECRET_KEY"] = "dev-secret-key" # Should be in settings for prod
    
    # Extensions
    CORS(app, resources={r"/api/*": {"origins": settings.CORS_ORIGINS}})
    
    # Blueprints
    app.register_blueprint(main_bp, url_prefix="/api")
    app.register_blueprint(transactions_bp, url_prefix="/api/transactions")
    
    @app.route("/api/health")
    def health_check():
        return {"status": "ok", "env": settings.ENV}

    return app

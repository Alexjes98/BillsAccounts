from flask import Flask
from flask_cors import CORS
from app.core.config import settings
from app.api.routes import main_bp
from app.api.transactions import transactions_bp
from app.api.persons import persons_bp
from app.api.debts import debts_bp
from app.api.categories import categories_bp
from app.api.dashboard import dashboard_bp
from app.api.accounts import accounts_bp
from app.api.monthly_summaries import monthly_summaries_bp
def create_app() -> Flask:
    app = Flask(__name__)

    # TODO: Implement JWT verification for Cognito User Pool tokens.
    # The frontend will send the access token in the Authorization header.
    # We need to verify the signature and claims before processing requests.
    
    # Initialize App Context (User retrieval)
    from app.core.context import setup_app_context
    setup_app_context(app)
    
    # Configuration
    app.config["SECRET_KEY"] = "dev-secret-key" # Should be in settings for prod
    
    # Extensions
    CORS(app, resources={r"/api/*": {"origins": settings.CORS_ORIGINS}})
    
    # Blueprints
    app.register_blueprint(main_bp, url_prefix="/api")
    app.register_blueprint(transactions_bp, url_prefix="/api/transactions")
    app.register_blueprint(persons_bp, url_prefix="/api/persons")
    app.register_blueprint(debts_bp, url_prefix="/api/debts")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(accounts_bp, url_prefix="/api/accounts")
    app.register_blueprint(monthly_summaries_bp, url_prefix="/api/monthly-summaries")
    
    from app.api.users import users_bp
    app.register_blueprint(users_bp, url_prefix="/api/users")
    
    @app.route("/api/health")
    def health_check():
        return {"status": "ok", "env": settings.ENV}
    return app
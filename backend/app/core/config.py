import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Personal Finance App"
    ENV: str = "dev"
    port: int = 8000 # Lowercase to match pydantic expectation or mapping, but typical usage is case-insensitive for env vars
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"] # Default Vite port

    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/dbname" # Default/Placeholder

    # Auth (Cognito)
    COGNITO_USER_POOL_ID: str = ""
    COGNITO_CLIENT_ID: str = ""
    COGNITO_REGION: str = "us-east-1"

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Free Mode
    UPLOAD_FOLDER: str = "/tmp/uploads"

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()

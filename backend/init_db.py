from app.core.database import engine, Base
from app.models.models import *
from sqlalchemy import text

def init_db():
    print("Initializing database...")
    
    # Enable uuid-ossp extension
    with engine.connect() as connection:
        connection.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
        connection.commit()
        print("Enabled uuid-ossp extension.")

    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")

if __name__ == "__main__":
    init_db()

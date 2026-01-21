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

    # Seed data
    from sqlalchemy.orm import sessionmaker
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Check if user exists
        user = session.query(User).filter_by(email="test@example.com").first()
        if not user:
            print("Seeding test data...")
            # Create User
            user = User(
                email="test@example.com",
                password_hash="hashed_secret", # In production use real hashing
                base_currency="USD"
            )
            session.add(user)
            session.flush() # flush to get user.id

            # Create Categories
            cat_salary = Category(user_id=user.id, name="Salary", type="INCOME", icon="💰", color="green")
            cat_food = Category(user_id=user.id, name="Food", type="EXPENSE", icon="🍔", color="red")
            cat_rent = Category(user_id=user.id, name="Rent", type="EXPENSE", icon="🏠", color="blue")
            
            session.add_all([cat_salary, cat_food, cat_rent])
            session.flush()

            # Create Account
            account = Account(user_id=user.id, name="Main Checking", type="CHECKING", current_balance=5000, currency="USD")
            session.add(account)
            session.flush()

            # Create Transactions
            t1 = Transaction(
                user_id=user.id,
                account_id=account.id,
                category_id=cat_salary.id,
                amount=3000.00,
                name="Monthly Salary",
                transaction_date=func.now()
            )
            t2 = Transaction(
                user_id=user.id,
                account_id=account.id,
                category_id=cat_rent.id,
                amount=-1200.00,
                name="Rent Payment",
                transaction_date=func.now()
            )
            t3 = Transaction(
                user_id=user.id,
                account_id=account.id,
                category_id=cat_food.id,
                amount=-50.25,
                name="Grocery Run",
                transaction_date=func.now()
            )

            session.add_all([t1, t2, t3])
            session.commit()
            print("Test data seeded successfully.")
        else:
            print("Test data already exists.")
            
    except Exception as e:
        session.rollback()
        print(f"Error seeding data: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    init_db()

from app.core.database import SessionLocal
from app.models.models import User, Category
import uuid

def verify():
    db = SessionLocal()
    try:
        print("Creating test user...")
        # Create a user
        test_email = f"test_{uuid.uuid4()}@example.com"
        user = User(
            email=test_email,
            password_hash="hashed_secret",
            base_currency="USD"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"User created with ID: {user.id}")

        print("Creating test category...")
        # Create a category
        category = Category(
            user_id=user.id,
            name="Groceries",
            type="EXPENSE",
            color="#FF0000"
        )
        db.add(category)
        db.commit()
        db.refresh(category)
        print(f"Category created with ID: {category.id}")

        print("Verification successful!")
    except Exception as e:
        print(f"Verification failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    verify()

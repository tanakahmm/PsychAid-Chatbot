from database import SessionLocal
from models import User, ParentChildRelation, MoodEntry
from datetime import datetime
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_database():
    db = SessionLocal()
    try:
        # Create test users
        parent = User(
            email="parent@test.com",
            password_hash=pwd_context.hash("password123"),
            first_name="John",
            last_name="Smith",
            user_type="parent"
        )
        
        child = User(
            email="child@test.com",
            password_hash=pwd_context.hash("password123"),
            first_name="Jimmy",
            last_name="Smith",
            user_type="student"
        )
        
        # Add users to database
        db.add(parent)
        db.add(child)
        db.commit()
        
        # Create parent-child relation
        relation = ParentChildRelation(
            parent_id=parent.id,
            child_id=child.id
        )
        db.add(relation)
        
        # Create test mood entry
        mood_entry = MoodEntry(
            user_id=child.id,
            timestamp=datetime.now(),
            score=0.8,
            message="Feeling great today!"
        )
        db.add(mood_entry)
        
        db.commit()
        print("Test data added successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database() 
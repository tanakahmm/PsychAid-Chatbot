from app.database import SessionLocal
from app.models import User, ParentChildRelation, MoodEntry
from datetime import datetime
from passlib.context import CryptContext
from sqlalchemy import inspect

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_tables_exist():
    db = SessionLocal()
    inspector = inspect(db.bind)
    tables = inspector.get_table_names()
    db.close()
    return "users" in tables and "parent_child_relations" in tables and "mood_entries" in tables

def seed_database():
    # First verify tables exist
    if not verify_tables_exist():
        print("Tables don't exist! Please run init_db.py first")
        return

    db = SessionLocal()
    try:
        # Check if data already exists
        existing_users = db.query(User).all()
        if existing_users:
            print("Data already exists in the database. Skipping seeding.")
            return

        print("Creating test users...")
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
        print(f"Created users with IDs: Parent={parent.id}, Child={child.id}")
        
        print("Creating parent-child relation...")
        relation = ParentChildRelation(
            parent_id=parent.id,
            child_id=child.id
        )
        db.add(relation)
        
        print("Creating test mood entry...")
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
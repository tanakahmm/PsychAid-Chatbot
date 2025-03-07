import os
from sqlalchemy import inspect
from app.database import engine, Base
# Import all models to ensure they're registered with Base
from app.models import User, ParentChildRelation, MoodEntry

def init_database():
    # Delete existing database file if it exists
    db_path = os.path.join(os.path.dirname(__file__), "..", "psychaid.db")
    if os.path.exists(db_path):
        os.remove(db_path)
        print("Removed existing database")
    
    print("Creating database tables...")
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Verify tables were created
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Created tables: {tables}")
    
    if not tables:
        print("Warning: No tables were created. Check your model definitions.")
    else:
        print("Database tables created successfully!")

if __name__ == "__main__":
    init_database() 
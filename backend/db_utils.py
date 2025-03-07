from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, ParentChildRelation, MoodEntry
from database import SQLALCHEMY_DATABASE_URL

def view_database_contents():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    print("\n=== Users ===")
    users = session.query(User).all()
    for user in users:
        print(f"ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"Name: {user.first_name} {user.last_name}")
        print(f"Type: {user.user_type}")
        print("---")

    print("\n=== Parent-Child Relations ===")
    relations = session.query(ParentChildRelation).all()
    for relation in relations:
        parent = session.query(User).filter_by(id=relation.parent_id).first()
        child = session.query(User).filter_by(id=relation.child_id).first()
        print(f"Parent: {parent.first_name} {parent.last_name} (ID: {parent.id})")
        print(f"Child: {child.first_name} {child.last_name} (ID: {child.id})")
        print("---")

    print("\n=== Mood Entries ===")
    entries = session.query(MoodEntry).all()
    for entry in entries:
        user = session.query(User).filter_by(id=entry.user_id).first()
        print(f"User: {user.first_name} {user.last_name}")
        print(f"Timestamp: {entry.timestamp}")
        print(f"Score: {entry.score}")
        print(f"Message: {entry.message}")
        print("---")

if __name__ == "__main__":
    view_database_contents() 
from app.database import SessionLocal
from app.models import User, ParentChildRelation, MoodEntry

def view_database_contents():
    db = SessionLocal()
    try:
        print("\n=== Users ===")
        users = db.query(User).all()
        for user in users:
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Name: {user.first_name} {user.last_name}")
            print(f"Type: {user.user_type}")
            print("---")

        print("\n=== Parent-Child Relations ===")
        relations = db.query(ParentChildRelation).all()
        for relation in relations:
            parent = db.query(User).filter_by(id=relation.parent_id).first()
            child = db.query(User).filter_by(id=relation.child_id).first()
            print(f"Parent: {parent.first_name} {parent.last_name} (ID: {parent.id})")
            print(f"Child: {child.first_name} {child.last_name} (ID: {child.id})")
            print("---")

        print("\n=== Mood Entries ===")
        entries = db.query(MoodEntry).all()
        for entry in entries:
            user = db.query(User).filter_by(id=entry.user_id).first()
            print(f"User: {user.first_name} {user.last_name}")
            print(f"Timestamp: {entry.timestamp}")
            print(f"Score: {entry.score}")
            print(f"Message: {entry.message}")
            print("---")
    finally:
        db.close()

if __name__ == "__main__":
    view_database_contents() 
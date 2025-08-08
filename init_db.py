#!/usr/bin/env python3
"""
Initialize database and create a test user
"""
from app.db.database import init_db, get_db
from app.crud.notes import create_user, get_password_hash
from app.db.schemas import UserCreate

def main():
    print("Initializing database...")
    init_db()
    
    print("Creating test user...")
    db = next(get_db())
    
    # Check if test user already exists
    from app.db.models import User
    existing_user = db.query(User).filter_by(username="testuser").first()
    
    if not existing_user:
        test_user = UserCreate(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        
        hashed_password = get_password_hash(test_user.password)
        create_user(db, test_user, hashed_password)
        print("✅ Test user created successfully!")
        print("Username: testuser")
        print("Password: testpass123")
        print("Email: test@example.com")
    else:
        print("✅ Test user already exists!")
        print("Username: testuser")
        print("Password: testpass123")
    
    db.close()

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3
"""
Initialize database and create a test user
"""
import os
import sys

def main():
    try:
        print("Initializing database...")
        from app.db.database import init_db, get_db
        from app.crud.notes import create_user, get_password_hash
        from app.db.schemas import UserCreate
        from app.db.models import User
        
        # Check database connection first
        from app.config import settings
        print(f"Database URL: {settings.database_url}")
        
        # Initialize database tables
        init_db()
        print("SUCCESS: Database tables created/verified")
        
        print("Creating test user...")
        db = next(get_db())
        
        # Check if test user already exists
        existing_user = db.query(User).filter_by(username="testuser").first()
        
        if not existing_user:
            test_user = UserCreate(
                username="testuser",
                email="test@example.com",
                password="testpass123"
            )
            
            hashed_password = get_password_hash(test_user.password)
            create_user(db, test_user, hashed_password)
            print("SUCCESS: Test user created successfully!")
            print("Username: testuser")
            print("Password: testpass123")
            print("Email: test@example.com")
        else:
            print("SUCCESS: Test user already exists!")
            print("Username: testuser")
            print("Password: testpass123")
        
        db.close()
        print("Database initialization completed successfully!")
        
    except Exception as e:
        print(f"ERROR: Database initialization failed: {e}")
        import traceback
        traceback.print_exc()
        # Don't exit with error code - let the app start anyway
        print("Continuing with app startup despite database error...")
        
if __name__ == "__main__":
    main() 
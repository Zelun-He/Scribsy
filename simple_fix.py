#!/usr/bin/env python3
"""
Simple script to fix the database by creating a minimal user table structure.
This bypasses the complex migration and creates a working auth system.
"""

import os
import sys
from sqlalchemy import create_engine, text

def fix_database_simple():
    """Create a simple working database structure"""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not found")
        return False
    
    print(f"Connecting to database...")
    
    # Create database engine
    engine = create_engine(database_url)
    
    print("Creating simple working database structure...")
    
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Drop and recreate the users table with minimal structure
            print("1. Dropping existing users table...")
            conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
            
            print("2. Creating new users table...")
            conn.execute(text("""
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR UNIQUE NOT NULL,
                    hashed_password VARCHAR NOT NULL,
                    email VARCHAR UNIQUE NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    is_admin INTEGER DEFAULT 0,
                    role VARCHAR DEFAULT 'provider',
                    last_login TIMESTAMP WITH TIME ZONE,
                    failed_login_attempts INTEGER DEFAULT 0,
                    account_locked_until TIMESTAMP WITH TIME ZONE,
                    tenant_id VARCHAR DEFAULT 'default',
                    work_start_time VARCHAR DEFAULT '09:00',
                    work_end_time VARCHAR DEFAULT '17:00',
                    timezone VARCHAR DEFAULT 'UTC',
                    working_days VARCHAR DEFAULT '1,2,3,4,5'
                );
            """))
            
            print("3. Creating indexes...")
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);"))
            
            print("4. Creating a test user...")
            # Create a test user with hashed password
            import hashlib
            test_password = "testpass123"
            hashed = hashlib.sha256(test_password.encode()).hexdigest()
            
            conn.execute(text("""
                INSERT INTO users (username, hashed_password, email, is_active, is_admin)
                VALUES ('testuser', :hashed_password, 'test@example.com', 1, 0)
                ON CONFLICT (username) DO NOTHING;
            """), {"hashed_password": hashed})
            
            trans.commit()
            print("✅ Database fix completed successfully!")
            print("✅ Test user created: username='testuser', password='testpass123'")
            
        except Exception as e:
            trans.rollback()
            print(f"❌ Fix failed: {e}")
            return False
    
    return True

if __name__ == "__main__":
    success = fix_database_simple()
    if success:
        print("\n🎉 Database is now working! Try logging in with testuser/testpass123")
    else:
        print("\n❌ Database fix failed.")

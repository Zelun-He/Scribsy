#!/usr/bin/env python3
"""
One-time script to fix the database schema in production.
This adds the missing columns to the users table.
"""

import os
import sys
from sqlalchemy import create_engine, text

def fix_database():
    """Add missing columns to the users table"""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not found")
        return False
    
    print(f"Connecting to database...")
    
    # Create database engine
    engine = create_engine(database_url)
    
    # SQL commands to add missing columns
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'provider';",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS work_start_time VARCHAR DEFAULT '09:00';",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS work_end_time VARCHAR DEFAULT '17:00';",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR DEFAULT 'UTC';",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS working_days VARCHAR DEFAULT '1,2,3,4,5';",
    ]
    
    print("Starting database fix...")
    
    with engine.connect() as conn:
        # Start a transaction
        trans = conn.begin()
        try:
            for i, migration in enumerate(migrations, 1):
                print(f"Running fix {i}/{len(migrations)}: {migration[:50]}...")
                try:
                    conn.execute(text(migration))
                    print(f"  ✅ Success")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        print(f"  ⚠️  Column already exists, skipping")
                    else:
                        print(f"  ❌ Error: {e}")
                        raise e
            
            # Commit the transaction
            trans.commit()
            print("✅ Database fix completed successfully!")
            
        except Exception as e:
            # Rollback on error
            trans.rollback()
            print(f"❌ Fix failed: {e}")
            return False
    
    return True

if __name__ == "__main__":
    success = fix_database()
    sys.exit(0 if success else 1)

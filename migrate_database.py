#!/usr/bin/env python3
"""
Database migration script to add missing columns to the users table.
Run this script to update the production database schema.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings

def migrate_database():
    """Add missing columns to the users table"""
    
    # Create database engine
    engine = create_engine(settings.database_url)
    



    # SQL commands to add missing columns (with error handling for SQLite)
    migrations = [
        "ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'provider';",
        "ALTER TABLE users ADD COLUMN last_login TIMESTAMP;",
        "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN account_locked_until TIMESTAMP;",
        "ALTER TABLE users ADD COLUMN work_start_time VARCHAR DEFAULT '09:00';",
        "ALTER TABLE users ADD COLUMN work_end_time VARCHAR DEFAULT '17:00';",
        "ALTER TABLE users ADD COLUMN timezone VARCHAR DEFAULT 'UTC';",
        "ALTER TABLE users ADD COLUMN working_days VARCHAR DEFAULT '1,2,3,4,5';",
    ]
    
    print("Starting database migration...")
    
    with engine.connect() as conn:
        # Start a transaction
        trans = conn.begin()
        try:
            for i, migration in enumerate(migrations, 1):
                print(f"Running migration {i}/{len(migrations)}: {migration[:50]}...")
                try:
                    conn.execute(text(migration))
                    print(f"  ✅ Success")
                except OperationalError as e:
                    if "duplicate column name" in str(e).lower():
                        print(f"  ⚠️  Column already exists, skipping")
                    else:
                        raise e
            
            # Commit the transaction
            trans.commit()
            print("✅ Database migration completed successfully!")
            
        except Exception as e:
            # Rollback on error
            trans.rollback()
            print(f"❌ Migration failed: {e}")
            return False
    
    return True

if __name__ == "__main__":
    success = migrate_database()
    sys.exit(0 if success else 1)

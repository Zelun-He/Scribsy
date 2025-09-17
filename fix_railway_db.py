#!/usr/bin/env python3
"""
Simple script to fix Railway database schema issues
This script adds missing columns to the users table
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

def fix_database():
    """Fix the database schema by adding missing columns"""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        return False
    
    print(f"Connecting to database: {database_url[:50]}...")
    
    try:
        # Create engine
        engine = create_engine(database_url)
        
        # Test connection
        with engine.connect() as conn:
            print("✓ Database connection successful")
            
            # Check if users table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'users'
                );
            """))
            table_exists = result.scalar()
            
            if not table_exists:
                print("ERROR: users table does not exist")
                return False
            
            print("✓ users table exists")
            
            # Add missing columns one by one
            columns_to_add = [
                ("role", "VARCHAR DEFAULT 'provider'"),
                ("last_login", "TIMESTAMP WITH TIME ZONE"),
                ("failed_login_attempts", "INTEGER DEFAULT 0"),
                ("account_locked_until", "TIMESTAMP WITH TIME ZONE"),
                ("work_start_time", "VARCHAR DEFAULT '09:00'"),
                ("work_end_time", "VARCHAR DEFAULT '17:00'"),
                ("timezone", "VARCHAR DEFAULT 'UTC'"),
                ("working_days", "VARCHAR DEFAULT '1,2,3,4,5'"),
            ]
            
            for column_name, column_def in columns_to_add:
                try:
                    # Check if column already exists
                    result = conn.execute(text(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_name = 'users' AND column_name = '{column_name}'
                        );
                    """))
                    column_exists = result.scalar()
                    
                    if not column_exists:
                        print(f"Adding column: {column_name}")
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {column_def};"))
                        conn.commit()
                        print(f"✓ Added column: {column_name}")
                    else:
                        print(f"✓ Column already exists: {column_name}")
                        
                except Exception as e:
                    print(f"Warning: Could not add column {column_name}: {e}")
                    # Continue with other columns
            
            print("\n✓ Database schema fix completed successfully!")
            return True
            
    except Exception as e:
        print(f"ERROR: Database operation failed: {e}")
        return False

if __name__ == "__main__":
    print("Railway Database Schema Fix")
    print("=" * 30)
    
    success = fix_database()
    
    if success:
        print("\n🎉 Database fix completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Database fix failed!")
        sys.exit(1)
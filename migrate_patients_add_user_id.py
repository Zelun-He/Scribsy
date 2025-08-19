#!/usr/bin/env python3
"""
Migration script to add user_id column to patients table.
This script will:
1. Add user_id column to patients table
2. Update existing patients to be associated with a default user (first user in the system)
3. Make user_id NOT NULL after migration
"""
import sqlite3
import os
from datetime import datetime

def migrate_patients_add_user_id():
    """Migrate the patients table to add user_id column."""
    
    # Get the database path
    db_path = "scribsy.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return
    
    print("Starting migration: Adding user_id to patients table...")
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if user_id column already exists
        cursor.execute("PRAGMA table_info(patients)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'user_id' in columns:
            print("user_id column already exists. Skipping migration.")
            return
        
        # Get the first user (default user for existing patients)
        cursor.execute("SELECT id FROM users LIMIT 1")
        user_result = cursor.fetchone()
        
        if not user_result:
            print("No users found in the database. Please create a user first.")
            return
        
        default_user_id = user_result[0]
        print(f"Using user ID {default_user_id} as default for existing patients.")
        
        # Add user_id column (initially nullable)
        print("Adding user_id column...")
        cursor.execute("ALTER TABLE patients ADD COLUMN user_id INTEGER")
        
        # Update existing patients to use the default user
        print("Updating existing patients...")
        cursor.execute("UPDATE patients SET user_id = ? WHERE user_id IS NULL", (default_user_id,))
        
        # Make user_id NOT NULL
        print("Making user_id NOT NULL...")
        
        # SQLite doesn't support ALTER COLUMN NOT NULL directly, so we need to recreate the table
        # First, get the current table structure
        cursor.execute("PRAGMA table_info(patients)")
        columns_info = cursor.fetchall()
        
        # Create new table with NOT NULL constraint
        new_columns = []
        for col in columns_info:
            if col[1] == 'user_id':
                new_columns.append(f"{col[1]} INTEGER NOT NULL")
            else:
                nullable = "NOT NULL" if col[3] else ""
                new_columns.append(f"{col[1]} {col[2]} {nullable}".strip())
        
        # Create new table
        new_table_sql = f"CREATE TABLE patients_new ({', '.join(new_columns)})"
        cursor.execute(new_table_sql)
        
        # Copy data to new table
        cursor.execute("INSERT INTO patients_new SELECT * FROM patients")
        
        # Drop old table and rename new table
        cursor.execute("DROP TABLE patients")
        cursor.execute("ALTER TABLE patients_new RENAME TO patients")
        
        # Recreate indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_patients_id ON patients(id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_patients_user_id ON patients(user_id)")
        
        # Commit the changes
        conn.commit()
        
        print("Migration completed successfully!")
        print(f"Added user_id column to patients table.")
        print(f"Associated {cursor.rowcount} existing patients with user ID {default_user_id}.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_patients_add_user_id() 
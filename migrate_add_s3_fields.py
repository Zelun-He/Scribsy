#!/usr/bin/env python3
"""
Migration script to add S3-related fields to the notes table
"""
import sqlite3
import os
from pathlib import Path

def migrate_database():
    """Add S3 fields to the notes table"""
    db_path = Path("scribsy.db")
    
    if not db_path.exists():
        print("Database file not found. Please run the application first to create it.")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(notes)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add S3-related columns if they don't exist
        if "s3_key" not in columns:
            print("Adding s3_key column...")
            cursor.execute("ALTER TABLE notes ADD COLUMN s3_key TEXT")
        
        if "file_size" not in columns:
            print("Adding file_size column...")
            cursor.execute("ALTER TABLE notes ADD COLUMN file_size INTEGER")
        
        if "content_type" not in columns:
            print("Adding content_type column...")
            cursor.execute("ALTER TABLE notes ADD COLUMN content_type TEXT")
        
        if "storage_provider" not in columns:
            print("Adding storage_provider column...")
            cursor.execute("ALTER TABLE notes ADD COLUMN storage_provider TEXT DEFAULT 'local'")
        
        # Commit changes
        conn.commit()
        print("Migration completed successfully!")
        
        # Show updated table structure
        cursor.execute("PRAGMA table_info(notes)")
        print("\nUpdated table structure:")
        for column in cursor.fetchall():
            print(f"  {column[1]} ({column[2]})")
            
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("Starting S3 fields migration...")
    migrate_database() 
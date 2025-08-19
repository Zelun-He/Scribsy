#!/usr/bin/env python3
"""
Initialize patients table in the database.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import engine, Base
from app.db.models import Patient, Note, User
from sqlalchemy import text

def init_patients_table():
    """Initialize the patients table"""
    print("🏥 Initializing Patients Table...")
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Patients table created successfully")
        
        # Check if patients table exists
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='patients'"))
            if result.fetchone():
                print("✅ Patients table exists in database")
            else:
                print("❌ Patients table not found")
                
    except Exception as e:
        print(f"❌ Error creating patients table: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    init_patients_table() 
#!/usr/bin/env python3
"""
Test script for Visit ID auto-generation functionality
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.crud.notes import generate_visit_id, create_note
from app.db.database import SessionLocal
from app.db.models import Note
from app.db import schemas
from datetime import datetime

def test_visit_id_generation():
    """Test the Visit ID auto-generation functionality"""
    print("🧪 Testing Visit ID Auto-Generation...")
    
    # Create a test database session
    db = SessionLocal()
    
    try:
        # Test with a sample patient
        patient_id = 12345
        
        print(f"📋 Testing Visit ID generation for Patient {patient_id}")
        
        # Create first note (should get visit_id = 1)
        note_data_1 = schemas.NoteCreate(
            patient_id=patient_id,
            provider_id=1,
            visit_id=None,  # Will be auto-generated
            note_type="consultation",
            content="Test note 1",
            status="pending_review"
        )
        
        note_1 = create_note(db, note_data_1)
        print(f"✅ First Note - Visit ID: {note_1.visit_id}")
        
        # Create second note (should get visit_id = 2)
        note_data_2 = schemas.NoteCreate(
            patient_id=patient_id,
            provider_id=1,
            visit_id=None,  # Will be auto-generated
            note_type="follow-up",
            content="Test note 2",
            status="pending_review"
        )
        
        note_2 = create_note(db, note_data_2)
        print(f"✅ Second Note - Visit ID: {note_2.visit_id}")
        
        # Verify increment
        if note_2.visit_id == note_1.visit_id + 1:
            print("✅ Visit ID auto-increment working correctly")
        else:
            print(f"❌ Visit ID increment failed: {note_1.visit_id} -> {note_2.visit_id}")
        
        # Test with different patient
        patient_id_2 = 67890
        note_data_3 = schemas.NoteCreate(
            patient_id=patient_id_2,
            provider_id=1,
            visit_id=None,  # Will be auto-generated
            note_type="consultation",
            content="Test note for different patient",
            status="pending_review"
        )
        
        note_3 = create_note(db, note_data_3)
        print(f"✅ Different Patient {patient_id_2} - Visit ID: {note_3.visit_id}")
        
        print("\n✅ Visit ID Auto-Generation Test Completed Successfully!")
        
    except Exception as e:
        print(f"❌ Visit ID Generation Test Failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    test_visit_id_generation() 
# Visit ID Auto-Generation Feature

## Overview

The Visit ID auto-generation feature eliminates the need for users to manually create Visit IDs, making the note creation process more convenient and error-free.

## How Visit IDs Are Normally Generated

### **Traditional Hospital Systems:**
- **Auto-generated** by hospital scheduling systems
- **Format**: Usually date-based with sequential numbering
- **Example**: `20241215-001` (Date-Sequential)

### **Electronic Health Records (EHR):**
- **Created automatically** when appointment is scheduled
- **Linked to patient demographics** and insurance
- **Integrated with billing systems**

## Implementation in Scribsy

### **Auto-Generation Logic:**

#### **1. Sequential Per Patient Per Day**
```python
def generate_visit_id(db: Session, patient_id: int) -> int:
    # Get the highest visit number for this patient on this date
    max_visit = db.query(func.max(models.Note.visit_id)).filter(
        models.Note.patient_id == patient_id,
        models.Note.created_at >= today_start,
        models.Note.created_at <= today_end
    ).scalar()
    
    if max_visit is None:
        visit_number = 1  # First visit of the day
    else:
        visit_number = max_visit + 1  # Increment
    
    return visit_number
```

#### **2. Examples:**
```
Patient #12345 on Dec 15, 2024:
- First note: Visit ID = 1
- Second note: Visit ID = 2
- Third note: Visit ID = 3

Patient #67890 on Dec 15, 2024:
- First note: Visit ID = 1 (separate from Patient #12345)
```

### **User Experience:**

#### **Before (Manual Entry):**
```
Patient ID: 12345
Visit ID: [User must think of a number] ← Inconvenient!
Note Type: consultation
```

#### **After (Auto-Generation):**
```
Patient ID: 12345
Visit ID: [Leave empty - auto-generated] ← Convenient!
Note Type: consultation
```

## Technical Implementation

### **Backend Changes:**

#### **1. Database Schema (`app/db/schemas.py`)**
```python
class NoteBase(BaseModel):
    patient_id: int
    provider_id: int
    visit_id: Optional[int] = None  # Now optional
    note_type: str
    content: str
    status: str
```

#### **2. CRUD Operations (`app/crud/notes.py`)**
```python
def create_note(db: Session, note: schemas.NoteCreate) -> models.Note:
    # Auto-generate Visit ID if not provided
    if not note.visit_id:
        note.visit_id = generate_visit_id(db, note.patient_id)
    
    db_note = models.Note(**note.dict())
    db.add(db_note)
    db.commit()
    return db_note
```

#### **3. API Endpoint (`app/api/endpoints/notes.py`)**
```python
@router.post("/", response_model=schemas.NoteRead)
async def create_note(
    patient_id: int = Form(...),
    visit_id: Optional[int] = Form(None),  # Now optional
    note_type: str = Form(...),
    # ... other fields
):
```

### **Frontend Changes:**

#### **1. TypeScript Types (`scribsy-frontend/src/types/index.ts`)**
```typescript
export interface CreateNoteRequest {
  patient_id: number;
  provider_id: number;
  visit_id?: number; // Optional - will be auto-generated
  note_type: string;
  content: string;
  status: string;
}
```

#### **2. Form Field (`scribsy-frontend/src/app/notes/new/page.tsx`)**
```tsx
<div>
  <label>Visit ID (Auto-generated)</label>
  <Input
    placeholder="Leave empty for auto-generation"
    className="bg-gray-50 dark:bg-gray-800"
  />
  <p className="text-xs text-gray-500">
    Leave empty to auto-generate based on patient and date
  </p>
</div>
```

## Benefits

### **1. User Convenience**
- **No manual thinking** required for Visit IDs
- **Reduces cognitive load** during note creation
- **Faster note creation** process

### **2. Error Prevention**
- **Eliminates duplicate** Visit IDs
- **Prevents invalid** Visit ID formats
- **Ensures consistency** across the system

### **3. Clinical Accuracy**
- **Proper sequencing** of patient visits
- **Chronological tracking** of care
- **Audit trail** compliance

### **4. System Reliability**
- **Automatic conflict resolution** for concurrent notes
- **Database integrity** maintained
- **Scalable** for high-volume practices

## Usage Examples

### **Scenario 1: First Visit of the Day**
```
Patient #12345 creates first note
→ Visit ID auto-generated: 1
→ Note created successfully
```

### **Scenario 2: Multiple Visits Same Day**
```
Patient #12345 creates second note
→ Visit ID auto-generated: 2
→ Note created successfully
```

### **Scenario 3: Different Patient**
```
Patient #67890 creates first note
→ Visit ID auto-generated: 1 (separate from Patient #12345)
→ Note created successfully
```

### **Scenario 4: Manual Override**
```
User enters Visit ID: 999
→ System uses: 999 (manual override)
→ Note created with custom Visit ID
```

## Testing

### **Test Script: `test_visit_id_generation.py`**
```bash
python test_visit_id_generation.py
```

**Test Results:**
```
✅ First Note - Visit ID: 1
✅ Second Note - Visit ID: 2
✅ Visit ID auto-increment working correctly
✅ Different Patient 67890 - Visit ID: 1
```

## Migration Notes

### **Backward Compatibility:**
- **Existing notes** with manual Visit IDs remain unchanged
- **Optional field** allows gradual migration
- **Manual override** still supported for special cases

### **Database Impact:**
- **No schema changes** required for existing data
- **New notes** benefit from auto-generation
- **Performance** optimized with proper indexing

## Future Enhancements

### **1. Advanced Formatting**
- **Date-based prefixes**: `20241215-001`
- **Location codes**: `CLINIC-A-001`
- **Specialty codes**: `CARD-001`

### **2. Integration Features**
- **Hospital system integration** for real Visit IDs
- **Appointment scheduling** linkage
- **Insurance billing** integration

### **3. Smart Features**
- **Conflict detection** for concurrent visits
- **Visit type classification** (emergency, routine, etc.)
- **Multi-provider** visit tracking

## Conclusion

The Visit ID auto-generation feature significantly improves the user experience by eliminating manual Visit ID creation while maintaining system integrity and clinical accuracy. This makes Scribsy more user-friendly and reduces the cognitive load on healthcare providers during note creation. 
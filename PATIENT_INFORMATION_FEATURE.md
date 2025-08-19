# Patient Information Feature

## Overview

The Patient Information feature adds comprehensive patient management capabilities to Scribsy, including date of birth, phone number, address, and email. This creates a complete patient database that enhances clinical documentation and patient care.

## Features

### **1. Comprehensive Patient Data**
- **Demographics**: First name, last name, date of birth
- **Contact Information**: Phone number, email address
- **Address**: Street address, city, state, ZIP code
- **Age Calculation**: Automatic age calculation from date of birth
- **Patient ID**: Unique identifier for each patient

### **2. Patient Management Interface**
- **Patient List**: View all patients with search and filter capabilities
- **Add Patient**: Comprehensive form for new patient registration
- **Edit Patient**: Update patient information
- **Delete Patient**: Remove patients (with safety checks)
- **Search**: Find patients by name, email, or phone number

### **3. Integration with Notes**
- **Patient-Notes Relationship**: Notes are linked to specific patients
- **Patient Context**: Notes display patient information
- **RAG Integration**: Patient history enhances AI note generation

## Technical Implementation

### **Database Schema**

#### **Patient Model (`app/db/models.py`)**
```python
class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    phone_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    notes = relationship("Note", back_populates="patient")
```

#### **Updated Note Model**
```python
class Note(Base):
    # ... existing fields ...
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True, nullable=False)
    patient = relationship("Patient", back_populates="notes")
```

### **Backend API**

#### **Patient Endpoints (`app/api/endpoints/patients.py`)**
- `GET /patients/` - List all patients with search
- `GET /patients/{id}` - Get specific patient
- `POST /patients/` - Create new patient
- `PUT /patients/{id}` - Update patient
- `DELETE /patients/{id}` - Delete patient
- `GET /patients/search/` - Search patients by name

#### **CRUD Operations (`app/crud/patients.py`)**
- `create_patient()` - Create new patient
- `get_patient()` - Retrieve patient by ID
- `get_patients()` - List patients with search
- `update_patient()` - Update patient information
- `delete_patient()` - Delete patient
- `search_patients_by_name()` - Search by first/last name

### **Frontend Implementation**

#### **Patient Types (`scribsy-frontend/src/types/index.ts`)**
```typescript
export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone_number?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  created_at: string;
  updated_at: string;
}
```

#### **API Client (`scribsy-frontend/src/lib/api.ts`)**
- `getPatients()` - Fetch all patients
- `getPatient()` - Get specific patient
- `createPatient()` - Create new patient
- `updatePatient()` - Update patient
- `deletePatient()` - Delete patient
- `searchPatients()` - Search patients

#### **Patient Management Pages**
- `/patients` - Patient list with search and management
- `/patients/new` - Add new patient form

## User Interface

### **Patient List Page (`/patients`)**

#### **Features:**
- **Search Bar**: Search by name, email, or phone
- **Patient Cards**: Display comprehensive patient information
- **Action Buttons**: Edit and delete patient options
- **Responsive Design**: Works on desktop and mobile

#### **Patient Information Display:**
```
Patient Card Layout:
┌─────────────────────────────────────┐
│ John Doe                    [Edit] [Delete]
│ Patient ID: #123
├─────────────────────────────────────┤
│ Demographics:                       │
│ DOB: January 15, 1985 (39 years)   │
│                                     │
│ Contact Information:                │
│ 📞 (555) 123-4567                  │
│ 📧 john.doe@email.com              │
│                                     │
│ Address:                            │
│ 📍 123 Main Street                 │
│     Anytown, CA 12345              │
└─────────────────────────────────────┘
```

### **Add Patient Page (`/patients/new`)**

#### **Form Sections:**
1. **Basic Information**
   - First Name (required)
   - Last Name (required)
   - Date of Birth (required)

2. **Contact Information**
   - Phone Number (optional)
   - Email Address (optional)

3. **Address Information**
   - Street Address (optional)
   - City (optional)
   - State (optional)
   - ZIP Code (optional)

## Benefits

### **1. Enhanced Clinical Documentation**
- **Patient Context**: Notes include complete patient information
- **Demographics**: Age and contact information readily available
- **Address**: Location information for follow-up care

### **2. Improved Patient Care**
- **Contact Information**: Easy access to phone and email
- **Age Awareness**: Automatic age calculation for clinical decisions
- **Address Tracking**: Location-based care coordination

### **3. Better Data Management**
- **Structured Data**: Organized patient information
- **Search Capabilities**: Find patients quickly
- **Data Integrity**: Validation and duplicate prevention

### **4. RAG Integration**
- **Patient History**: Enhanced context for AI note generation
- **Demographics**: Age-appropriate clinical guidelines
- **Contact Info**: Communication preferences in notes

## Data Validation

### **Backend Validation**
- **Required Fields**: First name, last name, date of birth
- **Email Validation**: Format and uniqueness checks
- **Phone Validation**: Format and uniqueness checks
- **Duplicate Prevention**: Email and phone uniqueness

### **Frontend Validation**
- **Form Validation**: Required field checking
- **Date Validation**: Proper date format
- **Email Validation**: Email format checking
- **Real-time Feedback**: Immediate validation messages

## Security & Privacy

### **Data Protection**
- **Authentication Required**: All patient endpoints require login
- **User Authorization**: Only authenticated users can access patient data
- **Input Sanitization**: All inputs are validated and sanitized

### **Privacy Considerations**
- **HIPAA Compliance**: Patient data handling follows medical privacy standards
- **Data Encryption**: Sensitive information is protected
- **Access Control**: Role-based access to patient information

## Usage Examples

### **Adding a New Patient**
```
1. Navigate to /patients
2. Click "Add Patient"
3. Fill in required fields:
   - First Name: John
   - Last Name: Doe
   - Date of Birth: 1985-01-15
4. Add optional information:
   - Phone: (555) 123-4567
   - Email: john.doe@email.com
   - Address: 123 Main Street, Anytown, CA 12345
5. Click "Create Patient"
```

### **Searching for a Patient**
```
1. Go to /patients
2. Use search bar to find by:
   - Name: "John Doe"
   - Email: "john.doe@email.com"
   - Phone: "555-123-4567"
3. Results show matching patients
```

### **Creating a Note for a Patient**
```
1. Go to /notes/new
2. Select patient from dropdown
3. Patient information is automatically populated
4. Create note with full patient context
```

## Future Enhancements

### **1. Advanced Patient Features**
- **Medical History**: Allergies, medications, conditions
- **Insurance Information**: Coverage and policy details
- **Emergency Contacts**: Family and emergency contact info
- **Photo Upload**: Patient photo for identification

### **2. Integration Features**
- **EHR Integration**: Connect with hospital systems
- **Insurance Verification**: Real-time coverage checking
- **Appointment Scheduling**: Integrated calendar system
- **Lab Results**: Connect with laboratory systems

### **3. Analytics & Reporting**
- **Patient Demographics**: Age, gender, location analysis
- **Visit Patterns**: Frequency and type of visits
- **Outcome Tracking**: Treatment effectiveness metrics
- **Population Health**: Community health insights

## Testing

### **Database Setup**
```bash
python init_patients_db.py
```

### **API Testing**
```bash
# Test patient creation
curl -X POST "http://localhost:8002/patients/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1985-01-15",
    "phone_number": "(555) 123-4567",
    "email": "john.doe@email.com"
  }'
```

## Conclusion

The Patient Information feature transforms Scribsy from a simple note-taking tool into a comprehensive patient management system. This enhancement provides healthcare providers with complete patient context, improving clinical documentation quality and patient care outcomes. 
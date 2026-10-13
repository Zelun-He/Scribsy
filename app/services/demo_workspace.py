"""An isolated, view-only public workspace containing only fictional records."""
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.exc import IntegrityError
from app.config import settings
from app.crud.notes import get_password_hash, get_user_by_username
from app.db import models
from app.db.database import SessionLocal

DEMO_USERNAME = "testuser"
DEMO_PASSWORD = "123456"  # Public demo credentials, never used by real accounts.
DEMO_EMAIL = "public-demo@scribsy.example"
DEMO_TENANT = "scribsy-public-demo"


def ensure_demo_workspace():
    if not settings.demo_enabled:
        return
    with SessionLocal() as db:
        user = get_user_by_username(db, DEMO_USERNAME)
        if user:
            if not user.is_demo:
                raise RuntimeError("Demo username is already owned by another account; it was not changed.")
            # Keep the fictional schedule and dashboard metrics useful after a restart.
            now = datetime.now(timezone.utc)
            for index, note in enumerate(db.query(models.Note).filter_by(provider_id=user.id).order_by(models.Note.id)):
                note.created_at = now - timedelta(hours=index)
                note.updated_at = note.created_at
                if note.signed_at:
                    note.signed_at = note.created_at
            for index, appointment in enumerate(db.query(models.Appointment).filter_by(user_id=user.id).order_by(models.Appointment.id)):
                appointment.scheduled_at = now + timedelta(minutes=20 + index * 40)
            db.commit()
            return
        try:
            user = models.User(username=DEMO_USERNAME, email=DEMO_EMAIL,
                               hashed_password=get_password_hash(DEMO_PASSWORD),
                               role="read_only", tenant_id=DEMO_TENANT,
                               is_active=1, is_admin=0, timezone="America/Chicago")
            db.add(user)
            db.flush()
            now = datetime.now(timezone.utc)
            patients = []
            for first, last, dob in [("Avery", "Morgan", date(1992, 4, 12)),
                                     ("Jordan", "Ellis", date(1984, 8, 21)),
                                     ("Taylor", "Reed", date(1978, 11, 3))]:
                patient = models.Patient(user_id=user.id, tenant_id=DEMO_TENANT,
                                         first_name=first, last_name=last, date_of_birth=dob,
                                         address="Fictional demo patient — not a real medical record.")
                db.add(patient)
                patients.append(patient)
            db.flush()
            examples = [
                ("Consultation", "Reports a right ankle injury during basketball two days ago.",
                 "Swelling and tenderness over the lateral ankle; no bony tenderness documented.",
                 "Illustrative ankle sprain assessment.", "Rest, ice, compression and elevation discussed; follow-up instructions documented."),
                ("Follow-up", "Reports intermittent lower back discomfort after long drives.",
                 "Provider examination documented in this fictional encounter.",
                 "Follow-up assessment ready for review.", ""),
                ("Progress", "", "", "", ""),
            ]
            for index in range(6):
                kind, subjective, objective, assessment, plan = examples[index % 3]
                finalized = index >= 3
                if finalized:
                    subjective = subjective or "Fictional follow-up symptoms documented."
                    objective = objective or "Fictional examination documented."
                    assessment = assessment or "Fictional assessment reviewed."
                    plan = plan or "Fictional follow-up plan reviewed."
                created = now - timedelta(hours=index)
                source = "Fictional demonstration visit. This is not a real patient record."
                content = source
                if subjective:
                    content += f"\n\n=== GENERATED SOAP NOTE ===\nSubjective: {subjective}\n\nObjective: {objective}\n\nAssessment: {assessment}\n\nPlan: {plan}"
                db.add(models.Note(patient_id=patients[index % 3].id, provider_id=user.id,
                                   tenant_id=DEMO_TENANT, visit_id=index + 1, note_type=kind,
                                   content=content, transcript=source,
                                   soap_subjective=subjective, soap_objective=objective,
                                   soap_assessment=assessment, soap_plan=plan,
                                   status="finalized" if finalized else "pending_review",
                                   signed_at=created if finalized else None,
                                   created_at=created, updated_at=created,
                                   creation_method="ai_assisted", time_saved_minutes=12))
            for index, patient in enumerate(patients):
                db.add(models.Appointment(patient_id=patient.id, user_id=user.id,
                                          title="Demo follow-up", note="Fictional appointment",
                                          notified=True, notify_before_minutes=0,
                                          scheduled_at=now + timedelta(minutes=20 + index * 40)))
            db.commit()
        except IntegrityError:
            # Multiple server workers can start together. Only accept a demo-owned collision.
            db.rollback()
            existing = get_user_by_username(db, DEMO_USERNAME)
            if not existing or not existing.is_demo:
                raise

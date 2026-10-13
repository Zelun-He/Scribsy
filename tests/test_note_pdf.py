"""PDFs preserve long clinical text, source notes and explicit record status."""
from datetime import datetime, timezone
from io import BytesIO
from types import SimpleNamespace

from pypdf import PdfReader

from app.services.note_pdf import build_note_pdf


def make_note(**overrides):
    values = dict(id=42, patient_id=7, visit_id="visit-42", note_type="SOAP",
                  created_at=datetime(2026, 10, 13, tzinfo=timezone.utc),
                  signed_at=None, status="pending", content="Original visit notes.",
                  transcript="Patient: Pain started yesterday.",
                  soap_subjective="Patient reports pain < 5 & no fever.",
                  soap_objective="Exam documented.", soap_assessment="Assessment documented.",
                  soap_plan="Follow-up documented.")
    values.update(overrides)
    return SimpleNamespace(**values)


def test_pdf_keeps_sections_sources_and_finalized_status():
    note = make_note(status="finalized", signed_at=datetime(2026, 10, 13, tzinfo=timezone.utc))
    patient = SimpleNamespace(first_name="Avery", last_name="Test", date_of_birth=None)
    pdf = PdfReader(BytesIO(build_note_pdf(note, patient, "Dr. Example")))
    text = "\n".join(page.extract_text() for page in pdf.pages)
    for value in ("FINALIZED NOTE", "Avery Test", "Dr. Example", "Subjective", "Objective",
                  "Assessment", "Plan", "pain < 5 & no fever", "Original visit notes.",
                  "Patient: Pain started yesterday."):
        assert value in text


def test_pdf_paginates_without_losing_end_of_long_text():
    note = make_note(soap_subjective=("Long clinical history for pagination. " * 700) + "END OF HISTORY",
                     soap_plan="END OF PLAN", content="", transcript="")
    patient = SimpleNamespace(first_name="Avery", last_name="Test", date_of_birth=None)
    pdf = PdfReader(BytesIO(build_note_pdf(note, patient, "Dr. Example")))
    assert len(pdf.pages) > 2
    text = "\n".join(page.extract_text() for page in pdf.pages)
    assert "END OF HISTORY" in text
    assert "END OF PLAN" in text
    assert "DRAFT / REQUIRES CLINICIAN REVIEW" in text
    for index, page in enumerate(pdf.pages, 1):
        assert f"PAGE {index}" in page.extract_text()

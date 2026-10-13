"""Readable, branded clinical-note exports with explicit draft/final status."""
from datetime import timezone
from html import escape
from io import BytesIO
from pathlib import Path
from threading import Lock
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

_FONT_LOCK = Lock()
_FONT_DIR = Path(__file__).resolve().parents[1] / "assets" / "fonts"


def _register_fonts():
    with _FONT_LOCK:
        if "PlexSans" not in pdfmetrics.getRegisteredFontNames():
            for name in ("PlexSans", "PlexSansSemibold", "PlexMono"):
                pdfmetrics.registerFont(TTFont(name, str(_FONT_DIR / f"{name}.ttf")))


def build_note_pdf(note, patient, provider_name: str) -> bytes:
    _register_fonts()
    ink, muted, blue, border = (colors.HexColor(value) for value in ("#0F1A24", "#556270", "#1D4ED8", "#DCE1E5"))
    finalized = note.status in ("finalized", "signed", "completed") or bool(note.signed_at)
    status = "FINALIZED NOTE" if finalized else "DRAFT / REQUIRES CLINICIAN REVIEW"
    patient_name = " ".join(filter(None, (getattr(patient, "first_name", ""), getattr(patient, "last_name", "")))) or f"Patient #{note.patient_id}"
    created = note.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    created_text = created.astimezone(timezone.utc).strftime("%b %d, %Y at %H:%M UTC")
    def safe(value):
        return escape(str(value or "")).replace("\n", "<br/>")
    body = ParagraphStyle("body", fontName="PlexSans", fontSize=10.5, leading=16, textColor=ink, spaceAfter=18, splitLongWords=True)
    title = ParagraphStyle("title", parent=body, fontName="PlexSansSemibold", fontSize=23, leading=29, spaceAfter=10)
    meta = ParagraphStyle("meta", parent=body, fontSize=10, leading=15, textColor=muted, spaceAfter=8)
    heading = ParagraphStyle("heading", parent=body, fontName="PlexSansSemibold", fontSize=12, leading=17, spaceAfter=8, keepWithNext=True)
    letter_style = ParagraphStyle("letter", parent=heading, fontName="PlexMono", textColor=blue)
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=48, rightMargin=48, topMargin=125, bottomMargin=52, title=f"Scribsy - Clinical Note {note.id}", author=provider_name)
    story = [Paragraph(safe(patient_name), title), Paragraph(safe(f"{note.note_type} | Visit {note.visit_id} | Note {note.id}"), meta), Paragraph(safe(f"Created {created_text} | Provider: {provider_name}"), meta)]
    if getattr(patient, "date_of_birth", None):
        story.append(Paragraph(safe(f"Date of birth: {patient.date_of_birth}"), meta))
    if note.signed_at:
        story.append(Paragraph(safe(f"Signed: {note.signed_at.isoformat()}"), meta))
    story.append(Spacer(1, 24))
    fields = [("S", "Subjective", note.soap_subjective), ("O", "Objective", note.soap_objective), ("A", "Assessment", note.soap_assessment), ("P", "Plan", note.soap_plan)]
    if any(value for _, _, value in fields):
        for label, name, value in fields:
            section_heading = Table([[Paragraph(label, letter_style), Paragraph(name, heading)]], colWidths=[28, 488])
            section_heading.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 8), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
            section_heading.keepWithNext = True
            story.extend([section_heading, Paragraph(safe(value or "Not documented."), body)])
    else:
        story.extend([Paragraph("Clinical notes", heading), Paragraph(safe(note.content), body)])
    source = (note.content or "").split("=== GENERATED SOAP NOTE ===")[0].strip()
    if any(value for _, _, value in fields) and source and source != (note.transcript or "").strip():
        story.extend([Spacer(1, 14), Paragraph("Visit notes", heading), Paragraph(safe(source), body)])
    if note.transcript:
        story.extend([Spacer(1, 14), Paragraph("Visit transcript", heading), Paragraph(safe(note.transcript), body)])
    def page(canvas, document):
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#F4F6F7")); canvas.rect(0, 702, 612, 90, fill=1, stroke=0)
        canvas.setFillColor(ink); canvas.setFont("PlexSansSemibold", 21); canvas.drawString(48, 753, "Scribsy")
        canvas.setFillColor(muted); canvas.setFont("PlexMono", 8.5); canvas.drawString(48, 730, status)
        canvas.setStrokeColor(border); canvas.line(48, 690, 564, 690); canvas.line(48, 40, 564, 40)
        canvas.setFont("PlexMono", 8); canvas.setFillColor(muted); canvas.drawString(48, 25, f"CLINICAL NOTE {note.id} / {note.status.upper()}"); canvas.drawRightString(564, 25, f"PAGE {document.page}")
        canvas.restoreState()
    doc.build(story, onFirstPage=page, onLaterPages=page)
    return buffer.getvalue()

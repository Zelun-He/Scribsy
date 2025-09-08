from pydantic import BaseModel, ValidationError
from openai import OpenAI
import os
import json
from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import Optional

class NoteSummary(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str

def _build_system_prompt(preferences: Optional[dict]) -> str:
    base = (
        """
You are an expert medical scribe trained in creating detailed, clinically accurate notes.

When provided with a raw medical conversation, transcription, or provider dictation, extract and summarize into clinical documentation.

Avoid adding any extra commentary or disclaimers. Do not invent information — only include details mentioned in the input or reasonably inferred from the provided context.
"""
    )
    if not preferences:
        # Default to SOAP format
        return (
            base
            + """
Your output must follow this format exactly:
Subjective: ...
Objective: ...
Assessment: ...
Plan: ...
"""
        )

    fmt = (preferences.get("format") or "soap").lower()
    verbosity = (preferences.get("verbosity") or "normal").lower()
    include = preferences.get("include_sections") or ["subjective","objective","assessment","plan"]
    bullet = bool(preferences.get("bulleted", False))
    clinical = bool(preferences.get("clinical_terms", True))
    expand_abbrev = bool(preferences.get("expand_abbreviations", False))
    template_text = (preferences.get("template_text") or "").strip()

    # Build formatting instructions
    lines = [base]
    if fmt == "soap":
        order = [s for s in ["subjective","objective","assessment","plan"] if s in include]
        lines.append("Use SOAP format in this exact order: " + ", ".join(x.title() for x in order) + ".")
        if bullet:
            lines.append("Within each section, use concise bullet points where appropriate.")
    elif fmt == "narrative":
        lines.append("Produce a narrative clinical summary with coherent paragraphs; avoid headings unless necessary.")
        if bullet:
            lines.append("You may use short bullet lists for labs/exam when clearer.")
    elif fmt == "bulleted":
        lines.append("Produce a fully bulleted summary grouped by topic (Subjective, Objective, Assessment, Plan).")

    if verbosity == "terse":
        lines.append("Be concise; include only essential details.")
    elif verbosity == "detailed":
        lines.append("Be thorough; include relevant details while avoiding redundancy.")

    if clinical:
        lines.append("Use clinical terminology appropriately.")
    else:
        lines.append("Prefer lay terminology where possible without losing accuracy.")

    if expand_abbrev:
        lines.append("Expand abbreviations on first use.")

    # Explicit output guidance for SOAP if present
    if fmt == "soap" or fmt == "bulleted":
        lines.append(
            "If using SOAP, structure exactly as: Subjective:, Objective:, Assessment:, Plan:."
        )
    if template_text:
        lines.append("Use the following template structure and headings when formatting the output. Keep headings and ordering consistent:")
        lines.append(template_text)
    return "\n".join(lines)


async def summarize_note(user_message: str, db: Optional[Session] = None,
                        patient_id: Optional[int] = None, visit_id: Optional[int] = None,
                        preferences: Optional[dict] = None) -> NoteSummary:
    from app.config import settings
    # Initialize OpenAI client once per process
    global client
    try:
        client
    except NameError:
        client = OpenAI(api_key=settings.openai_api_key or os.getenv("OPENAI_API_KEY"))

    # Optional RAG service; guard import to avoid hard dependency
    rag_service = None
    try:
        from app.services.rag_service import rag_service as _rag_service
        rag_service = _rag_service
    except Exception:
        rag_service = None
    
    # Build system prompt with user preferences
    system_prompt = _build_system_prompt(preferences)

    # Use RAG context if available
    if db and patient_id and visit_id and rag_service:
        try:
            context = rag_service.get_patient_context(db, patient_id, visit_id, user_message)
            contextual_prompt = rag_service.create_contextual_prompt(user_message, context)
            
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {"role": "user", "content": contextual_prompt},
                ],
                temperature=0.3,
            )
        except Exception as e:
            print(f"RAG context retrieval failed: {e}, falling back to basic summarization")
            # Fall back to basic summarization if RAG fails
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {"role": "user", "content": user_message},
                ],
                temperature=0.3,
            )
    else:
        # Basic summarization without RAG context
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
        )

    content = response.choices[0].message.content
    # Convert plain text SOAP note to a dictionary
    lines = content.strip().split("\n")
    summary_data = {"subjective": "", "objective": "", "assessment": "", "plan": ""}
    current_key = None

    for line in lines:
        if line.lower().startswith("subjective:"):
            current_key = "subjective"
            summary_data[current_key] = line.partition(":")[2].strip()
        elif line.lower().startswith("objective:"):
            current_key = "objective"
            summary_data[current_key] = line.partition(":")[2].strip()
        elif line.lower().startswith("assessment:"):
            current_key = "assessment"
            summary_data[current_key] = line.partition(":")[2].strip()
        elif line.lower().startswith("plan:"):
            current_key = "plan"
            summary_data[current_key] = line.partition(":")[2].strip()
        elif current_key:
            # Append additional lines to the current section
            summary_data[current_key] += " " + line.strip()

    return NoteSummary(**summary_data)

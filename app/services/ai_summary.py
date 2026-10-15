from pydantic import BaseModel
from openai import OpenAI, AuthenticationError, RateLimitError
import logging
import os
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

Avoid adding any extra commentary or disclaimers. Do not invent information — only include details explicitly documented in the input.
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
    import asyncio
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="SOAP generation requires a configured OpenAI API key. Your notes can still be saved manually.")
    client = OpenAI(api_key=api_key, timeout=90, max_retries=1)
    system_prompt = _build_system_prompt(preferences) + """
Return a JSON object with exactly four string keys: subjective, objective, assessment, plan.
Apply style preferences within those fields. Do not output markdown fences or headings outside the JSON.
Do not invent or infer symptoms, findings, diagnoses, or treatments. If a section is not documented, use an empty string.
"""
    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-4o",
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_message}],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        return NoteSummary.model_validate_json(response.choices[0].message.content or "")
    except HTTPException:
        raise
    except AuthenticationError as exc:
        logging.getLogger(__name__).error('SOAP provider rejected authentication')
        raise HTTPException(status_code=503, detail='SOAP generation requires a valid OPENAI_API_KEY in the backend settings. Your transcript is available.') from exc
    except RateLimitError as exc:
        logging.getLogger(__name__).error('SOAP provider usage limit reached')
        raise HTTPException(status_code=503, detail='SOAP generation has reached its provider usage limit. Your transcript is available; retry later or continue editing manually.') from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="SOAP generation failed. Your transcript is available; retry or continue editing manually.") from exc
    finally:
        client.close()

from pydantic import BaseModel, ValidationError
import openai
import os
import json
from fastapi import HTTPException

class NoteSummary(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str

def summarize_note(user_message: str) -> NoteSummary:
    openai.api_key = os.getenv("OPENAI_API_KEY")
    response = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": """
You are an expert medical scribe trained in creating detailed, clinically accurate SOAP (Subjective, Objective, Assessment, Plan) notes.

When provided with a raw medical conversation, transcription, or provider dictation, extract and summarize information into:
- Subjective: Patient's stated complaints, symptoms, and history in the patient's own words or as described by the provider.
- Objective: Observable findings, vital signs, physical exam results, lab or imaging results, or factual measurements.
- Assessment: The provider's clinical impressions, differential diagnoses, or conclusions about the patient's condition.
- Plan: The proposed or enacted plan of care, including tests ordered, medications prescribed, procedures done, follow-up instructions, lifestyle recommendations, and referrals.

Your output must follow this format exactly:
Subjective: ...
Objective: ...
Assessment: ...
Plan: ...

Avoid adding any extra commentary or disclaimers. Do not invent information — only include details mentioned in the input.
"""
            },
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,
    )

    content = response.choices[0].message["content"]
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

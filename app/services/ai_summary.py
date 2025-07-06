from pydantic import BaseModel
import openai
import os
import json

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
            {"role": "system", "content": "You are an expert medical scribe generating structured SOAP notes."},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message["content"]
    data = json.loads(content)
    return NoteSummary(**data)

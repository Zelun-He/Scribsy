"""
preferences.py: Simple per-user AI preferences storage using a JSON file.
In production, move this to a proper database table.
"""
import json
import os
from typing import Any, Dict, Optional
from threading import Lock

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'data')
PREFS_PATH = os.path.abspath(os.path.join(DATA_DIR, 'user_prefs.json'))
_lock = Lock()

DEFAULT_PREFS: Dict[str, Any] = {
    "format": "soap",              # soap | narrative | bulleted
    "verbosity": "normal",         # terse | normal | detailed
    "include_sections": ["subjective", "objective", "assessment", "plan"],
    "bulleted": False,
    "clinical_terms": True,
    "expand_abbreviations": False,
    "ros_sections": [],
    "pe_sections": [],
    "template_text": "",
}

def _ensure_file():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(PREFS_PATH):
        with open(PREFS_PATH, 'w', encoding='utf-8') as f:
            json.dump({}, f)

def load_user_preferences(user_id: int) -> Dict[str, Any]:
    _ensure_file()
    with _lock:
        try:
            with open(PREFS_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f) or {}
        except Exception:
            data = {}
    prefs = data.get(str(user_id)) or {}
    # Merge with defaults
    merged = { **DEFAULT_PREFS, **prefs }
    return merged

def save_user_preferences(user_id: int, prefs: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_file()
    with _lock:
        try:
            with open(PREFS_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f) or {}
        except Exception:
            data = {}
        # Only allow known keys
        clean = { k: v for k, v in prefs.items() if k in DEFAULT_PREFS }
        merged = { **load_user_preferences(user_id), **clean }
        data[str(user_id)] = merged
        with open(PREFS_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f)
    return merged

def reset_user_preferences(user_id: int) -> Dict[str, Any]:
    _ensure_file()
    with _lock:
        try:
            with open(PREFS_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f) or {}
        except Exception:
            data = {}
        data[str(user_id)] = DEFAULT_PREFS.copy()
        with open(PREFS_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f)
    return DEFAULT_PREFS.copy()



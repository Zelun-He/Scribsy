from fastapi import APIRouter, Depends, HTTPException
from app.api.endpoints.auth import get_current_user
from app.services.preferences import load_user_preferences, save_user_preferences, reset_user_preferences, DEFAULT_PREFS
from typing import Dict, Any

router = APIRouter(prefix="/preferences", tags=["preferences"])

@router.get("/me")
def get_my_prefs(current_user = Depends(get_current_user)) -> Dict[str, Any]:
    return load_user_preferences(current_user.id)

@router.put("/me")
def update_my_prefs(prefs: Dict[str, Any], current_user = Depends(get_current_user)) -> Dict[str, Any]:
    try:
        return save_user_preferences(current_user.id, prefs)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/me/reset")
def reset_my_prefs(current_user = Depends(get_current_user)) -> Dict[str, Any]:
    return reset_user_preferences(current_user.id)



"""
nudge_manager.py: Implements Finalize-Note Nudge Manager per provided spec.
Returns JSON instruction with scheduling and messaging decisions.
"""
from datetime import datetime, timedelta
from typing import Dict, Any


def _localize(dt: datetime) -> datetime:
    # Assumes inputs are already local times; extend with pytz/zoneinfo if needed
    return dt


def evaluate_nudge(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    tz = config.get("time_zone", "America/Chicago")
    end_of_clinic_grace = int(config.get("end_of_clinic_grace_minutes", 45))
    next_morning_hour = int(config.get("next_morning_hour_local", 9))
    daily_close_hours = int(config.get("daily_close_hours", 24))
    escalation_hours = int(config.get("escalation_hours", 48))
    max_inline = int(config.get("max_inline_nudges_per_visit", 1))
    max_digest = int(config.get("max_digest_per_day", 1))
    max_escalations = int(config.get("max_escalations_per_note_per_day", 1))
    allow_after_hours = bool(config.get("allow_after_hours", False))
    secure_channel = bool(config.get("secure_channel", True))

    clinician = inputs.get("clinician", {})
    encounter = inputs.get("encounter", {})
    note_status = inputs.get("note_status", {})
    schedule = inputs.get("schedule", {})
    org_policy = inputs.get("org_policy", {})
    system_now = _localize(inputs.get("system_clock_now"))

    # Rate-limit placeholders (the host app must track counts)
    inline_sent = int(inputs.get("inline_sent", 0))
    digests_sent_today = int(inputs.get("digests_sent_today", 0))
    escalations_sent_today = int(inputs.get("escalations_sent_today", 0))

    def decision(should: bool, typ: str = None, send_at: datetime = None, message: str = "", actions=None, reason: str = "", note_id: str = ""):
        return {
            "should_send": should,
            "type": typ,
            "send_at": send_at.isoformat() if send_at else None,
            "message": message,
            "actions": actions or [],
            "log": {"reason": reason, "note_id": note_id, "rate_limited": False},
        }

    # Guardrails: DND/PTO or insecure channel can suppress content
    if clinician.get("status") in ("DND", "PTO"):
        return decision(False, reason="Clinician unavailable (DND/PTO)", note_id=str(encounter.get("id", "")))

    # Ready to sign inline
    if note_status.get("all_required_sections_complete") and not note_status.get("awaiting_results"):
        within_clinic = False
        end_time = schedule.get("clinic_day_end_time")
        if end_time and system_now <= _localize(end_time):
            within_clinic = True
        if clinician.get("status") == "available" and within_clinic and inline_sent < max_inline:
            if secure_channel:
                msg = f"{encounter.get('patient_display','Patient')}: HPI/ROS/PE/Plan complete. Ready to finalize and sign now?"
            else:
                msg = "This visit note is complete. Ready to finalize and sign?"
            return decision(True, "INLINE_READY_TO_SIGN", system_now, msg, [{"label":"Sign now","route":f"/notes/{encounter.get('id')}/sign"},{"label":"Open note","route":f"/notes/{encounter.get('id')}"}], "inline_ready", str(encounter.get("id","")))

    # Awaiting results -> set watcher
    if note_status.get("awaiting_results"):
        return decision(False, reason="Awaiting results", note_id=str(encounter.get("id","")))

    # End-of-clinic digest trigger
    if digests_sent_today < max_digest:
        clinic_end = schedule.get("clinic_day_end_time")
        if clinic_end:
            send_at = _localize(clinic_end) + timedelta(minutes=end_of_clinic_grace)
            if system_now <= send_at:
                count = int(inputs.get("digest_count", 0))
                if count > 0:
                    if secure_channel:
                        names = inputs.get("digest_names", [])
                        list_str = " ".join([f"• {n}" for n in names[:3]]) + ("…" if len(names) > 3 else "")
                    else:
                        list_str = ""
                    msg = f"You have {count} notes ready from today. Estimated {count*2} min total." + (f"\n{list_str}" if list_str else "")
                    return decision(True, "END_OF_CLINIC_DIGEST", send_at, msg, [{"label":"Sign all","route":"/notes?filter=ready"},{"label":"Open queue","route":"/notes?filter=unsigned"}], "end_of_clinic_digest")

    # Next-morning reminder
    if not allow_after_hours:
        nm = system_now.replace(hour=next_morning_hour, minute=0, second=0, microsecond=0)
        if system_now < nm:
            # Schedule for next morning
            send_at = nm
        else:
            send_at = (system_now + timedelta(days=1)).replace(hour=next_morning_hour, minute=0, second=0, microsecond=0)
        remaining = int(inputs.get("remaining_unsigned_count", 0))
        if remaining > 0:
            return decision(True, "NEXT_MORNING_REMINDER", send_at, f"Reminder: {remaining} notes from yesterday are ready to sign.", [{"label":"Open queue","route":"/notes?filter=unsigned"}], "next_morning")

    # Escalation
    strict = org_policy.get("strict_hours") if isinstance(org_policy, dict) else None
    threshold = int(strict) if strict else escalation_hours
    age_hours = int(inputs.get("note_age_hours", 0))
    if age_hours >= threshold and escalations_sent_today < max_escalations:
        count = int(inputs.get("escalation_count", 1))
        return decision(True, "ESCALATION_48H", system_now, f"Attention: {count} note(s) older than {threshold} hours remain unsigned. Please finalize today.", [{"label":"Open queue","route":"/notes?filter=unsigned"}], "escalation")

    return decision(False, reason="No eligible nudge", note_id=str(encounter.get("id","")))



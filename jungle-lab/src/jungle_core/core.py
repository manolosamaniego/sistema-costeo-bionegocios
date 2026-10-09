"""Prototype controls only; do not treat as a production security boundary."""
import re
from enum import Enum

class ContextClass(str, Enum):
    ALLOW = "ALLOW"
    RESTRICTED = "RESTRICTED"
    NEVER_CONTEXT = "NEVER_CONTEXT"

class ReviewStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    PASS_WITH_WARNINGS = "PASS_WITH_WARNINGS"

SKILL_SIGNALS = {
    "informe-aliados": ("aliados", "ayuda memoria", "visita técnica", "sachayllu"),
    "jungle-build": ("jungle lab", "codex", "desarrollar módulo", "arquitectura"),
    "costos-rentabilidad": ("costos", "rentabilidad", "margen", "punto de equilibrio"),
    "educacion-adaptativa": ("educación", "neurociencias", "cuestionario", "capacitación"),
}
CRITICAL_ACTIONS = frozenset(("send", "delete", "pay", "publish", "deploy", "master_data_write", "merge"))

def route_skill(task: str):
    normalized = task.casefold()
    matches = [(sum(signal in normalized for signal in signals), name) for name, signals in SKILL_SIGNALS.items()]
    score, name = max(matches)
    return name if score else None

def classify_context(text: str, *, explicit_restricted=False):
    if re.search(r"(?i)(-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]|\.env\b)", text):
        return ContextClass.NEVER_CONTEXT
    if explicit_restricted:
        return ContextClass.RESTRICTED
    return ContextClass.ALLOW

def authorize_context(level: ContextClass, *, sanitized=False, approved=False):
    return level == ContextClass.ALLOW or (level == ContextClass.RESTRICTED and sanitized and approved)

def approval_required(action: str):
    return action.casefold() in CRITICAL_ACTIONS

def review_status(value: str):
    return ReviewStatus(value)

def can_execute(action: str, *, approved=False, independent_review=False, review=ReviewStatus.FAIL):
    if not independent_review or review != ReviewStatus.PASS:
        return False
    return not approval_required(action) or approved

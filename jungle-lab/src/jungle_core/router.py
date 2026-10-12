"""Fail-closed router: only approved local skills, no remote installs."""
from .skill_catalog import select_skill

def route_task(task: str, *, context_authorized: bool = False):
    """Do not select a skill for use until task context is authorized."""
    if not context_authorized:
        return None
    return select_skill(task)

"""Fail-closed, project-scoped router: no remote installs."""
from .skill_catalog import select_skill
from .project_scope import skill_allowed_in_project

def route_task(task: str, *, context_authorized: bool = False, project_id: str | None = None):
    """Explicit context authorization and project scope are both mandatory."""
    if not context_authorized or not project_id:
        return None
    skill = select_skill(task)
    if skill is None or not skill_allowed_in_project(project_id, skill):
        return None
    return skill

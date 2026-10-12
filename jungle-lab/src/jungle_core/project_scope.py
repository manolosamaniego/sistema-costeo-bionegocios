"""Explicit project isolation for authorized skill execution."""
from dataclasses import dataclass

@dataclass(frozen=True)
class ProjectScope:
    project_id: str
    allowed_skills: frozenset[str]

SCOPES = {
    "aliados": ProjectScope("aliados", frozenset({"informe-aliados", "costos-rentabilidad"})),
    "mikuna-cacao": ProjectScope("mikuna-cacao", frozenset({"costos-rentabilidad"})),
    "jungle-lab": ProjectScope("jungle-lab", frozenset({"jungle-build", "costos-rentabilidad"})),
    "educacion": ProjectScope("educacion", frozenset({"educacion-adaptativa"})),
}

def skill_allowed_in_project(project_id: str, skill: str) -> bool:
    scope = SCOPES.get(project_id)
    return bool(scope and skill in scope.allowed_skills)

"""Curated, offline skill discovery. No network access or automatic installs."""
from dataclasses import dataclass
from enum import Enum

class CandidateStatus(str, Enum):
    APPROVED = "APPROVED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    REJECTED = "REJECTED"

@dataclass(frozen=True)
class SkillCandidate:
    name: str
    description: str
    source: str
    status: CandidateStatus
    capabilities: tuple

CATALOG = (
    SkillCandidate("informe-aliados", "Informes institucionales Aliados y Ayuda Memoria", "internal", CandidateStatus.APPROVED, ("informe", "aliados", "ayuda memoria")),
    SkillCandidate("costos-rentabilidad", "Costos, márgenes y punto de equilibrio", "internal", CandidateStatus.APPROVED, ("costos", "rentabilidad", "margen", "punto de equilibrio")),
    SkillCandidate("jungle-build", "Desarrollo y pruebas de Jungle Lab", "internal", CandidateStatus.APPROVED, ("desarrollo", "código", "pruebas", "codex")),
    SkillCandidate("educacion-adaptativa", "Explicaciones y cuestionarios educativos", "internal", CandidateStatus.APPROVED, ("educación", "cuestionario", "neurociencias")),
    SkillCandidate("find-skills", "Buscar habilidades de terceros; requiere auditoría previa", "https://github.com/vercel-labs/skills", CandidateStatus.REVIEW_REQUIRED, ("buscar skills", "encontrar habilidades")),
)

def discover(query: str):
    if not isinstance(query, str) or not query.strip():
        return ()
    query = query.casefold()
    return tuple(c for c in CATALOG if any(term in query or query in term for term in c.capabilities))

def install_allowed(candidate: SkillCandidate, *, human_approved=False, security_review_passed=False):
    """Only pre-approved internal skills are active; third-party installs disabled."""
    return candidate.source == "internal" and candidate.status == CandidateStatus.APPROVED

def select_skill(query: str):
    """Select only unambiguous approved internal skills; otherwise require manual review."""
    matches = [c for c in discover(query) if install_allowed(c)]
    return matches[0].name if len(matches) == 1 else None

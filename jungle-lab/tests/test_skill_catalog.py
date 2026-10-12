import unittest
from jungle_core.skill_catalog import CATALOG, CandidateStatus, discover, install_allowed, select_skill

class TestSkillCatalog(unittest.TestCase):
    def test_internal_skill_selected(self):
        self.assertEqual(select_skill("costos"), "costos-rentabilidad")
        self.assertEqual(select_skill("ayuda memoria"), "informe-aliados")
    def test_external_skill_not_installable(self):
        external = next(c for c in CATALOG if c.name == "find-skills")
        self.assertEqual(external.status, CandidateStatus.REVIEW_REQUIRED)
        self.assertFalse(install_allowed(external, human_approved=True, security_review_passed=True))
        self.assertIsNone(select_skill("buscar skills"))
    def test_no_guessing(self):
        self.assertIsNone(select_skill(""))
        self.assertIsNone(select_skill("algo sin relación"))
    def test_catalog_immutable(self):
        with self.assertRaises(Exception):
            CATALOG[0].name = "modified"

if __name__ == "__main__":
    unittest.main()

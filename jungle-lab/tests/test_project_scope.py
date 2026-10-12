import unittest
from jungle_core.project_scope import skill_allowed_in_project
from jungle_core.router import route_task

class TestProjectScope(unittest.TestCase):
    def test_aliados_mikuna_separation(self):
        self.assertTrue(skill_allowed_in_project("aliados", "informe-aliados"))
        self.assertFalse(skill_allowed_in_project("mikuna-cacao", "informe-aliados"))
    def test_unknown_scope_denied(self):
        self.assertFalse(skill_allowed_in_project("unknown", "costos-rentabilidad"))
    def test_router_scoped(self):
        self.assertEqual(route_task("ayuda memoria", context_authorized=True, project_id="aliados"), "informe-aliados")
        self.assertIsNone(route_task("ayuda memoria", context_authorized=True, project_id="mikuna-cacao"))
        self.assertIsNone(route_task("costos", context_authorized=True))
        self.assertEqual(route_task("costos", context_authorized=True, project_id="mikuna-cacao"), "costos-rentabilidad")

if __name__ == "__main__":
    unittest.main()

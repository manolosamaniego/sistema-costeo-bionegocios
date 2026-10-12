import unittest
from jungle_core.router import route_task

class TestRouter(unittest.TestCase):
    def test_requires_context_authorization_and_project(self):
        self.assertIsNone(route_task("costos"))
        self.assertIsNone(route_task("costos", context_authorized=True))
        self.assertEqual(route_task("costos", context_authorized=True, project_id="aliados"), "costos-rentabilidad")
    def test_untrusted_skill_never_selected(self):
        self.assertIsNone(route_task("buscar skills", context_authorized=True, project_id="jungle-lab"))
    def test_ambiguous_or_unknown_not_routed(self):
        self.assertIsNone(route_task("no coincide", context_authorized=True, project_id="aliados"))

if __name__ == "__main__":
    unittest.main()

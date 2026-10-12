import unittest
from jungle_core.router import route_task

class TestRouter(unittest.TestCase):
    def test_requires_context_authorization(self):
        self.assertIsNone(route_task("costos"))
        self.assertEqual(route_task("costos", context_authorized=True), "costos-rentabilidad")
    def test_untrusted_skill_never_selected(self):
        self.assertIsNone(route_task("buscar skills", context_authorized=True))
    def test_ambiguous_or_unknown_not_routed(self):
        self.assertIsNone(route_task("no coincide", context_authorized=True))

if __name__ == "__main__":
    unittest.main()

import unittest
from jungle_core.core import *

class TestCore(unittest.TestCase):
    def test_skill_routing(self):
        self.assertEqual(route_skill("Prepara la ayuda memoria Aliados"), "informe-aliados")
        self.assertEqual(route_skill("Analiza los costos de producción"), "costos-rentabilidad")
        self.assertIsNone(route_skill("Hola"))
    def test_secret_block(self):
        self.assertEqual(classify_context("api_key=example"), ContextClass.NEVER_CONTEXT)
        self.assertFalse(authorize_context(ContextClass.NEVER_CONTEXT, sanitized=True, approved=True))
    def test_restricted_requires_both(self):
        self.assertFalse(authorize_context(ContextClass.RESTRICTED, approved=True))
        self.assertTrue(authorize_context(ContextClass.RESTRICTED, approved=True, sanitized=True))
    def test_approval_and_review(self):
        self.assertFalse(can_execute("publish", independent_review=True, review=ReviewStatus.PASS))
        self.assertFalse(can_execute("publish", approved=True, review=ReviewStatus.PASS))
        self.assertTrue(can_execute("publish", approved=True, independent_review=True, review=ReviewStatus.PASS))
    def test_review_values(self):
        self.assertEqual(review_status("PASS_WITH_WARNINGS"), ReviewStatus.PASS_WITH_WARNINGS)
        with self.assertRaises(ValueError):
            review_status("APPROVED")

if __name__ == "__main__":
    unittest.main()

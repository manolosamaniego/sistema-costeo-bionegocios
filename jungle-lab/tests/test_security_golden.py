import unittest
from jungle_core.core import (
    ContextClass, ReviewStatus, ApprovalDecision,
    classify_context_strict, can_execute_verified,
)

class TestSecurityGolden(unittest.TestCase):
    def test_unknown_is_restricted(self):
        self.assertEqual(classify_context_strict("Datos del proyecto"), ContextClass.RESTRICTED)
        self.assertEqual(classify_context_strict(""), ContextClass.RESTRICTED)
    def test_public_must_be_explicit(self):
        self.assertEqual(classify_context_strict("Manual público", approved_public=True), ContextClass.ALLOW)
    def test_secrets_never_context_even_if_public(self):
        for sample in ("api_key=abc", "Authorization: Bearer abc", ".env", "postgres://db", "-----BEGIN PRIVATE KEY-----"):
            with self.subTest(sample=sample):
                self.assertEqual(classify_context_strict(sample, approved_public=True), ContextClass.NEVER_CONTEXT)
    def test_independent_review_required(self):
        self.assertFalse(can_execute_verified("read", "t1", reviewer_id="same", builder_id="same", review=ReviewStatus.PASS))
        self.assertTrue(can_execute_verified("read", "t1", reviewer_id="reviewer", builder_id="builder", review=ReviewStatus.PASS))
    def test_critical_requires_verified_approval(self):
        base = dict(reviewer_id="reviewer", builder_id="builder", review=ReviewStatus.PASS)
        self.assertFalse(can_execute_verified("deploy", "t1", **base))
        bad = ApprovalDecision("human", "t1", "deploy", True, lambda _: False)
        self.assertFalse(can_execute_verified("deploy", "t1", approval=bad, **base))
        good = ApprovalDecision("human", "t1", "deploy", True, lambda _: True)
        self.assertTrue(can_execute_verified("deploy", "t1", approval=good, **base))
        self.assertFalse(can_execute_verified("delete", "t1", approval=good, **base))
    def test_builder_cannot_approve(self):
        approval = ApprovalDecision("builder", "t1", "publish", True, lambda _: True)
        self.assertFalse(can_execute_verified("publish", "t1", reviewer_id="reviewer", builder_id="builder", review=ReviewStatus.PASS, approval=approval))

if __name__ == "__main__":
    unittest.main()

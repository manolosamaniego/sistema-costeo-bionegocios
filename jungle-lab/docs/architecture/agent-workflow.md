# Workflow
Explorer (read-only) → Builder (reversible changes only) → independent Reviewer (`PASS`, `FAIL`, `PASS_WITH_WARNINGS`) → Human ApprovalGate. Builder cannot approve its own output. The current module implements only illustrative decision helpers, not full agents. All external providers and models must be behind gateways. Route by FAST / STANDARD / HEAVY / LONG_HORIZON capabilities.

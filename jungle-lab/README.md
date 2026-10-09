# Jungle Lab 3.1 — experimental integration

Independent prototype; does not alter existing business modules. Python 3 standard library only.

Run tests: `PYTHONPATH=jungle-lab/src python -m unittest discover -s jungle-lab/tests -v`.

Routing is heuristic, not an LLM. Context and approval guards are demonstration controls, **not production security boundaries**. Do not connect to live data, credentials, payment, email, deployments or external providers until hardened and reviewed.

Workflow: Explorer → Builder → independent Reviewer → Human ApprovalGate. Model tiers: FAST, STANDARD, HEAVY, LONG_HORIZON. Providers must remain behind replaceable gateways.

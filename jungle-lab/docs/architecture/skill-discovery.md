# Skill discovery policy

Internal curated Skills are active and can be selected. External skills (including find-skills) are **catalog entries only**, not installed or executed. Review source and scripts, pin version/commit, scan dependencies, run sandbox tests, assess prompt injection and data exfiltration risks, then require independent review and human approval before enabling any external code. Popularity is not a security guarantee.

The Xabi PDF describes the find-skills command `npx skills add https://github.com/vercel-labs/skills --skill find-skills`. This command has deliberately NOT been executed. No outbound network or package install is performed by this module.

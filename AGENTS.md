# Agent Instructions

Keep `dependency-drift-gate` narrow, local, deterministic, inspectable, and honest.

Do not add network calls, npm/package-registry calls, GitHub calls, package installation behavior, package script execution, databases, MCP integrations, AgentGate integrations, or LLM calls to product behavior.

Do not add vulnerability-scanning, malware-detection, CVE-checking, or dependency safety claims. Review labels are conservative review prompts only, not safety verdicts.

Preserve v0.1.0 scope unless James explicitly asks to expand it:

- Node/npm projects only.
- `package.json` input only.
- Compare `dependencies`, `devDependencies`, `optionalDependencies`, `peerDependencies`, `scripts`, and `bin`.

Before release, run:

```sh
npm test
npm run typecheck
npm run build
npm run demo:no-drift
npm run demo:review
npm run demo:elevated
git diff --check
```

Keep `DEPENDENCY_DRIFT_GATE_PROJECT_CONTEXT.md` gitignored and local. After any git cleanup, verify that it still exists locally and remains ignored.

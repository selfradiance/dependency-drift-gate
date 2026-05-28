# dependency-drift-gate

## What This Proves

`dependency-drift-gate` proves that two local `package.json` files can be compared deterministically before and after an AI coding-agent session, producing an inspectable report of newly introduced dependency drift, package execution surfaces, and review-worthy declared changes.

It is meant to be a narrow local gate before install, merge, or trust.

## What This Does Not Prove

This does not prove a dependency is safe or unsafe.

This does not scan installed packages.

This does not detect malware.

This does not check CVEs.

This does not call npm, GitHub, package registries, or the network.

It only compares declared local `package.json` dependency/script/bin drift.

## Quick Start

```sh
npm install
npm run inspect -- --before fixtures/before.safe.package.json --after fixtures/after.added-dependency.package.json
```

Write a machine-readable report:

```sh
npm run inspect -- --before fixtures/before.safe.package.json --after fixtures/after.added-dependency.package.json --json-out .dependency-drift-gate/last-report.json
```

The CLI exits `0` for a successful inspection regardless of review label. It exits nonzero for invalid arguments, missing files, invalid JSON, unreadable input, or inability to write `--json-out`.

`--json-out` is refused if it would overwrite either input file.

## Demo Commands

```sh
npm run demo:no-drift
npm run demo:review
npm run demo:elevated
```

Expected labels:

- `demo:no-drift` -> `no_drift`
- `demo:review` -> `review`
- `demo:elevated` -> `elevated_review`

## Review Labels

- `no_drift`: no added, removed, or changed dependencies; no added, removed, or changed scripts; no added, removed, or changed bin entries.
- `review`: dependency drift, non-lifecycle script drift, or bin entry drift without elevated signals.
- `elevated_review`: lifecycle install script drift, shell/process execution in scripts, sensitive credential terms, or bin entrypoints combined with shell/network/credential/filesystem signals.

These are conservative review labels only. They are not safety verdicts.

## Category Tags

The report can include these deterministic static category tags:

- `dependency_added`
- `dependency_removed`
- `dependency_version_changed`
- `lifecycle_script_added`
- `lifecycle_script_changed`
- `shell_execution_surface`
- `network_surface`
- `filesystem_surface`
- `credential_surface`
- `install_surface`
- `bin_entrypoint_added`
- `unknown`

Categories are inferred from declared dependency names, changed script text, and changed bin entries. The heuristics are intentionally simple and inspectable.

## Example Output

```text
dependency-drift-gate v0.1.0
Before: /path/to/before.safe.package.json
After: /path/to/after.added-dependency.package.json
Review label: review
Categories: dependency_added

Summary:
- Added dependencies: 1
- Removed dependencies: 0
- Changed dependency versions: 0
- Added scripts: 0
- Removed scripts: 0
- Changed scripts: 0
- Added bin entries: 0
- Removed bin entries: 0
- Changed bin entries: 0

Findings:
- finding-001 [review] dependency_added
  Dependency added: dependencies.is-odd (^3.0.1).
```

## JSON Report

Optional pretty JSON includes:

- tool name and version
- generated timestamp
- before and after paths
- review label
- sorted categories
- summary counts
- dependency changes
- script changes
- bin changes
- stable findings like `finding-001`

## Boundaries

Product behavior reads local JSON files only. It does not install packages, execute package scripts, call npm, query registries, call GitHub, use a database, make network calls, or call an LLM.

Version `0.1.0` supports Node/npm `package.json` only. It compares:

- `dependencies`
- `devDependencies`
- `optionalDependencies`
- `peerDependencies`
- `scripts`
- `bin`

Lockfile comparison is future work. This version does not parse `package-lock.json`.

## Development

```sh
npm test
npm run typecheck
npm run build
npm run demo:no-drift
npm run demo:review
npm run demo:elevated
git diff --check
```

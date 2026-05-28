import {
  type BinChange,
  type CategoryTag,
  type ClassificationResult,
  type DependencyChange,
  type DriftDiff,
  type Finding,
  type ReviewLabel,
  type ScriptChange
} from "./types.js";

const LIFECYCLE_SCRIPTS = new Set([
  "preinstall",
  "install",
  "postinstall",
  "prepare",
  "prepack",
  "postpack",
  "prepublish",
  "prepublishOnly"
]);

const NETWORK_SIGNALS = [
  "fetch",
  "axios",
  "request",
  "got",
  "undici",
  "node-fetch",
  "websocket",
  "ws",
  "socket",
  "http",
  "https",
  "curl",
  "wget"
];

const FILESYSTEM_SIGNALS = [
  "fs-extra",
  "glob",
  "rimraf",
  "del-cli",
  "mkdirp",
  "chokidar",
  "write-file",
  "file",
  "path"
];

const CREDENTIAL_SIGNALS = [
  "dotenv",
  "keytar",
  "auth",
  "oauth",
  "token",
  "credential",
  "secret",
  "password",
  "aws",
  "gcp",
  "azure"
];

const ELEVATED_CREDENTIAL_TERMS = [
  "token",
  "secret",
  "credential",
  "password",
  "oauth",
  "aws",
  "gcp",
  "azure"
];

const SCRIPT_SHELL_PATTERNS = [
  /\bsh\b/i,
  /\bbash\b/i,
  /\bzsh\b/i,
  /\bnode\s+-e\b/i,
  /\bpython\b/i,
  /\bpython3\b/i,
  /\bruby\b/i,
  /\bperl\b/i,
  /\bcurl\b/i,
  /\bwget\b/i,
  /\brm\s+-rf\b/i,
  /\bchmod\b/i,
  /\bsudo\b/i,
  /\beval\b/i,
  /\bnpx\b/i,
  /\bnpm\s+exec\b/i,
  /\bchild_process\b/i
];

interface DraftFinding {
  label: Exclude<ReviewLabel, "no_drift">;
  category: CategoryTag;
  message: string;
  evidence: Record<string, unknown>;
}

export function classifyDrift(diff: DriftDiff): ClassificationResult {
  const draftFindings: DraftFinding[] = [];

  for (const change of diff.dependencyChanges) {
    draftFindings.push(dependencyFinding(change));

    if (change.type !== "removed") {
      const text = change.name;
      addSurfaceFindings(draftFindings, {
        source: "dependency",
        text,
        baseLabel: isElevatedCredentialText(text) && change.type === "added" ? "elevated_review" : "review",
        evidence: dependencyEvidence(change)
      });
    }
  }

  for (const change of diff.scriptChanges) {
    draftFindings.push(scriptFinding(change));

    if (change.type !== "removed") {
      const scriptText = change.afterScript ?? "";
      const lifecycle = LIFECYCLE_SCRIPTS.has(change.name);

      if (lifecycle) {
        draftFindings.push({
          label: "elevated_review",
          category: "install_surface",
          message: `Lifecycle script introduces install-time execution surface: ${change.name}.`,
          evidence: scriptEvidence(change)
        });
      }

      if (SCRIPT_SHELL_PATTERNS.some((pattern) => pattern.test(scriptText))) {
        draftFindings.push({
          label: "elevated_review",
          category: "shell_execution_surface",
          message: `Script introduces shell or process execution surface: ${change.name}.`,
          evidence: scriptEvidence(change)
        });
      }

      addSurfaceFindings(draftFindings, {
        source: "script",
        text: `${change.name} ${scriptText}`,
        baseLabel: isElevatedCredentialText(scriptText) ? "elevated_review" : "review",
        evidence: scriptEvidence(change)
      });
    }
  }

  for (const change of diff.binChanges) {
    draftFindings.push(binFinding(change));

    if (change.type === "added" || change.type === "changed") {
      const text = `${change.name} ${change.afterEntry ?? ""}`;
      const surfaceCategories = inferSurfaceCategories(text);
      const binAddedWithSurface = change.type === "added" && surfaceCategories.length > 0;

      for (const category of surfaceCategories) {
        draftFindings.push({
          label: binAddedWithSurface ? "elevated_review" : "review",
          category,
          message: `Bin entry introduces ${category.replaceAll("_", " ")} signal: ${change.name}.`,
          evidence: binEvidence(change)
        });
      }
    }
  }

  const findings = draftFindings.map((finding, index): Finding => ({
    id: `finding-${String(index + 1).padStart(3, "0")}`,
    ...finding
  }));

  const categories = [...new Set(findings.map((finding) => finding.category))].sort((left, right) =>
    left.localeCompare(right)
  );
  const hasDrift =
    diff.dependencyChanges.length > 0 || diff.scriptChanges.length > 0 || diff.binChanges.length > 0;
  const hasElevatedFinding = findings.some((finding) => finding.label === "elevated_review");
  const label: ReviewLabel = !hasDrift ? "no_drift" : hasElevatedFinding ? "elevated_review" : "review";

  return {
    label,
    categories,
    findings
  };
}

function dependencyFinding(change: DependencyChange): DraftFinding {
  if (change.type === "added") {
    return {
      label: isElevatedCredentialText(change.name) ? "elevated_review" : "review",
      category: "dependency_added",
      message: `Dependency added: ${change.section}.${change.name} (${change.afterVersion}).`,
      evidence: dependencyEvidence(change)
    };
  }

  if (change.type === "removed") {
    return {
      label: "review",
      category: "dependency_removed",
      message: `Dependency removed: ${change.section}.${change.name} (${change.beforeVersion}).`,
      evidence: dependencyEvidence(change)
    };
  }

  return {
    label: "review",
    category: "dependency_version_changed",
    message: `Dependency version changed: ${change.section}.${change.name} (${change.beforeVersion} -> ${change.afterVersion}).`,
    evidence: dependencyEvidence(change)
  };
}

function scriptFinding(change: ScriptChange): DraftFinding {
  if (change.type === "added") {
    const lifecycle = LIFECYCLE_SCRIPTS.has(change.name);
    return {
      label: lifecycle ? "elevated_review" : "review",
      category: lifecycle ? "lifecycle_script_added" : "unknown",
      message: `Script added: ${change.name}.`,
      evidence: scriptEvidence(change)
    };
  }

  if (change.type === "changed") {
    const lifecycle = LIFECYCLE_SCRIPTS.has(change.name);
    return {
      label: lifecycle ? "elevated_review" : "review",
      category: lifecycle ? "lifecycle_script_changed" : "unknown",
      message: `Script changed: ${change.name}.`,
      evidence: scriptEvidence(change)
    };
  }

  return {
    label: "review",
    category: "unknown",
    message: `Script removed: ${change.name}.`,
    evidence: scriptEvidence(change)
  };
}

function binFinding(change: BinChange): DraftFinding {
  if (change.type === "added") {
    return {
      label: "review",
      category: "bin_entrypoint_added",
      message: `Bin entry added: ${change.name}.`,
      evidence: binEvidence(change)
    };
  }

  if (change.type === "changed") {
    return {
      label: "review",
      category: "unknown",
      message: `Bin entry changed: ${change.name}.`,
      evidence: binEvidence(change)
    };
  }

  return {
    label: "review",
    category: "unknown",
    message: `Bin entry removed: ${change.name}.`,
    evidence: binEvidence(change)
  };
}

function addSurfaceFindings(
  findings: DraftFinding[],
  options: {
    source: "dependency" | "script";
    text: string;
    baseLabel: Exclude<ReviewLabel, "no_drift">;
    evidence: Record<string, unknown>;
  }
): void {
  for (const category of inferSurfaceCategories(options.text)) {
    findings.push({
      label: options.baseLabel,
      category,
      message: `${capitalize(options.source)} introduces ${category.replaceAll("_", " ")} signal.`,
      evidence: options.evidence
    });
  }
}

function inferSurfaceCategories(text: string): CategoryTag[] {
  const categories: CategoryTag[] = [];

  if (matchesAnySignal(text, NETWORK_SIGNALS)) {
    categories.push("network_surface");
  }

  if (matchesAnySignal(text, FILESYSTEM_SIGNALS)) {
    categories.push("filesystem_surface");
  }

  if (matchesAnySignal(text, CREDENTIAL_SIGNALS)) {
    categories.push("credential_surface");
  }

  return categories;
}

function matchesAnySignal(text: string, signals: string[]): boolean {
  return signals.some((signal) => matchesSignal(text, signal));
}

function matchesSignal(text: string, signal: string): boolean {
  const normalized = text.toLowerCase();
  const escaped = escapeRegExp(signal.toLowerCase());

  if (signal.length <= 3) {
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(normalized);
  }

  return normalized.includes(signal.toLowerCase());
}

function isElevatedCredentialText(text: string): boolean {
  return matchesAnySignal(text, ELEVATED_CREDENTIAL_TERMS);
}

function dependencyEvidence(change: DependencyChange): Record<string, unknown> {
  return {
    kind: change.kind,
    type: change.type,
    section: change.section,
    name: change.name,
    before_version: change.beforeVersion,
    after_version: change.afterVersion
  };
}

function scriptEvidence(change: ScriptChange): Record<string, unknown> {
  return {
    kind: change.kind,
    type: change.type,
    name: change.name,
    before_script: change.beforeScript,
    after_script: change.afterScript
  };
}

function binEvidence(change: BinChange): Record<string, unknown> {
  return {
    kind: change.kind,
    type: change.type,
    name: change.name,
    before_entry: change.beforeEntry,
    after_entry: change.afterEntry
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

import {
  TOOL_NAME,
  TOOL_VERSION,
  type ClassificationResult,
  type DriftDiff,
  type DriftReport,
  type SummaryCounts
} from "./types.js";

export function buildReport(
  beforePath: string,
  afterPath: string,
  diff: DriftDiff,
  classification: ClassificationResult,
  generatedAt = new Date()
): DriftReport {
  const summary = buildSummary(diff, classification.findings.length);

  return {
    tool: TOOL_NAME,
    version: TOOL_VERSION,
    generated_at: generatedAt.toISOString(),
    before_path: beforePath,
    after_path: afterPath,
    label: classification.label,
    categories: classification.categories,
    summary,
    dependency_changes: diff.dependencyChanges,
    script_changes: diff.scriptChanges,
    bin_changes: diff.binChanges,
    findings: classification.findings
  };
}

export function renderHumanReport(report: DriftReport): string {
  const lines = [
    `${report.tool} v${report.version}`,
    `Before: ${report.before_path}`,
    `After: ${report.after_path}`,
    `Review label: ${report.label}`,
    `Categories: ${report.categories.length > 0 ? report.categories.join(", ") : "none"}`,
    "",
    "Summary:",
    `- Added dependencies: ${report.summary.added_dependencies}`,
    `- Removed dependencies: ${report.summary.removed_dependencies}`,
    `- Changed dependency versions: ${report.summary.changed_dependencies}`,
    `- Added scripts: ${report.summary.added_scripts}`,
    `- Removed scripts: ${report.summary.removed_scripts}`,
    `- Changed scripts: ${report.summary.changed_scripts}`,
    `- Added bin entries: ${report.summary.added_bin_entries}`,
    `- Removed bin entries: ${report.summary.removed_bin_entries}`,
    `- Changed bin entries: ${report.summary.changed_bin_entries}`
  ];

  if (report.findings.length === 0) {
    lines.push("", "Findings: none");
  } else {
    lines.push("", "Findings:");
    for (const finding of report.findings) {
      lines.push(
        `- ${finding.id} [${finding.label}] ${finding.category}`,
        `  ${finding.message}`
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export function renderJsonReport(report: DriftReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

function buildSummary(diff: DriftDiff, findingCount: number): SummaryCounts {
  const addedDependencies = diff.dependencyChanges.filter((change) => change.type === "added").length;
  const removedDependencies = diff.dependencyChanges.filter((change) => change.type === "removed").length;
  const changedDependencies = diff.dependencyChanges.filter((change) => change.type === "changed").length;
  const addedScripts = diff.scriptChanges.filter((change) => change.type === "added").length;
  const removedScripts = diff.scriptChanges.filter((change) => change.type === "removed").length;
  const changedScripts = diff.scriptChanges.filter((change) => change.type === "changed").length;
  const addedBinEntries = diff.binChanges.filter((change) => change.type === "added").length;
  const removedBinEntries = diff.binChanges.filter((change) => change.type === "removed").length;
  const changedBinEntries = diff.binChanges.filter((change) => change.type === "changed").length;

  return {
    dependency_changes: diff.dependencyChanges.length,
    added_dependencies: addedDependencies,
    removed_dependencies: removedDependencies,
    changed_dependencies: changedDependencies,
    script_changes: diff.scriptChanges.length,
    added_scripts: addedScripts,
    removed_scripts: removedScripts,
    changed_scripts: changedScripts,
    bin_changes: diff.binChanges.length,
    added_bin_entries: addedBinEntries,
    removed_bin_entries: removedBinEntries,
    changed_bin_entries: changedBinEntries,
    findings: findingCount
  };
}

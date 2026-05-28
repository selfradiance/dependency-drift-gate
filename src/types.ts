export const TOOL_NAME = "dependency-drift-gate";
export const TOOL_VERSION = "0.1.0";

export const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies"
] as const;

export type DependencySection = (typeof DEPENDENCY_SECTIONS)[number];

export const CATEGORY_TAGS = [
  "bin_entrypoint_added",
  "credential_surface",
  "dependency_added",
  "dependency_removed",
  "dependency_version_changed",
  "filesystem_surface",
  "install_surface",
  "lifecycle_script_added",
  "lifecycle_script_changed",
  "network_surface",
  "shell_execution_surface",
  "unknown"
] as const;

export type CategoryTag = (typeof CATEGORY_TAGS)[number];
export type ReviewLabel = "no_drift" | "review" | "elevated_review";
export type ChangeType = "added" | "removed" | "changed";

export type StringMap = Record<string, string>;
export type DependencyMap = Record<DependencySection, StringMap>;

export interface PackageSnapshot {
  filePath: string;
  packageName?: string;
  dependencies: DependencyMap;
  scripts: StringMap;
  bin: StringMap;
}

export interface DependencyChange {
  kind: "dependency";
  type: ChangeType;
  section: DependencySection;
  name: string;
  beforeVersion?: string;
  afterVersion?: string;
}

export interface ScriptChange {
  kind: "script";
  type: ChangeType;
  name: string;
  beforeScript?: string;
  afterScript?: string;
}

export interface BinChange {
  kind: "bin";
  type: ChangeType;
  name: string;
  beforeEntry?: string;
  afterEntry?: string;
}

export interface DriftDiff {
  dependencyChanges: DependencyChange[];
  scriptChanges: ScriptChange[];
  binChanges: BinChange[];
}

export interface Finding {
  id: string;
  label: Exclude<ReviewLabel, "no_drift">;
  category: CategoryTag;
  message: string;
  evidence: Record<string, unknown>;
}

export interface ClassificationResult {
  label: ReviewLabel;
  categories: CategoryTag[];
  findings: Finding[];
}

export interface SummaryCounts {
  dependency_changes: number;
  added_dependencies: number;
  removed_dependencies: number;
  changed_dependencies: number;
  script_changes: number;
  added_scripts: number;
  removed_scripts: number;
  changed_scripts: number;
  bin_changes: number;
  added_bin_entries: number;
  removed_bin_entries: number;
  changed_bin_entries: number;
  findings: number;
}

export interface DriftReport {
  tool: string;
  version: string;
  generated_at: string;
  before_path: string;
  after_path: string;
  label: ReviewLabel;
  categories: CategoryTag[];
  summary: SummaryCounts;
  dependency_changes: DependencyChange[];
  script_changes: ScriptChange[];
  bin_changes: BinChange[];
  findings: Finding[];
}

import {
  DEPENDENCY_SECTIONS,
  type BinChange,
  type DependencyChange,
  type DriftDiff,
  type PackageSnapshot,
  type ScriptChange,
  type StringMap
} from "./types.js";

export function diffPackages(before: PackageSnapshot, after: PackageSnapshot): DriftDiff {
  const dependencyChanges = DEPENDENCY_SECTIONS.flatMap((section) =>
    diffStringMap(before.dependencies[section], after.dependencies[section]).map(
      (change): DependencyChange => {
        if (change.type === "added") {
          return {
            kind: "dependency",
            type: "added",
            section,
            name: change.name,
            afterVersion: change.afterValue
          };
        }

        if (change.type === "removed") {
          return {
            kind: "dependency",
            type: "removed",
            section,
            name: change.name,
            beforeVersion: change.beforeValue
          };
        }

        return {
          kind: "dependency",
          type: "changed",
          section,
          name: change.name,
          beforeVersion: change.beforeValue,
          afterVersion: change.afterValue
        };
      }
    )
  ).sort(compareDependencyChanges);

  const scriptChanges = diffStringMap(before.scripts, after.scripts).map(
    (change): ScriptChange => {
      if (change.type === "added") {
        return {
          kind: "script",
          type: "added",
          name: change.name,
          afterScript: change.afterValue
        };
      }

      if (change.type === "removed") {
        return {
          kind: "script",
          type: "removed",
          name: change.name,
          beforeScript: change.beforeValue
        };
      }

      return {
        kind: "script",
        type: "changed",
        name: change.name,
        beforeScript: change.beforeValue,
        afterScript: change.afterValue
      };
    }
  );

  const binChanges = diffStringMap(before.bin, after.bin).map((change): BinChange => {
    if (change.type === "added") {
      return {
        kind: "bin",
        type: "added",
        name: change.name,
        afterEntry: change.afterValue
      };
    }

    if (change.type === "removed") {
      return {
        kind: "bin",
        type: "removed",
        name: change.name,
        beforeEntry: change.beforeValue
      };
    }

    return {
      kind: "bin",
      type: "changed",
      name: change.name,
      beforeEntry: change.beforeValue,
      afterEntry: change.afterValue
    };
  });

  return {
    dependencyChanges,
    scriptChanges,
    binChanges
  };
}

type StringChange =
  | {
      type: "added";
      name: string;
      afterValue: string;
    }
  | {
      type: "removed";
      name: string;
      beforeValue: string;
    }
  | {
      type: "changed";
      name: string;
      beforeValue: string;
      afterValue: string;
    };

function diffStringMap(before: StringMap, after: StringMap): StringChange[] {
  const names = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort((left, right) =>
    left.localeCompare(right)
  );
  const changes: StringChange[] = [];

  for (const name of names) {
    const beforeValue = before[name];
    const afterValue = after[name];

    if (beforeValue === undefined && afterValue !== undefined) {
      changes.push({ type: "added", name, afterValue });
      continue;
    }

    if (beforeValue !== undefined && afterValue === undefined) {
      changes.push({ type: "removed", name, beforeValue });
      continue;
    }

    if (beforeValue !== undefined && afterValue !== undefined && beforeValue !== afterValue) {
      changes.push({ type: "changed", name, beforeValue, afterValue });
    }
  }

  return changes;
}

function compareDependencyChanges(left: DependencyChange, right: DependencyChange): number {
  return (
    left.name.localeCompare(right.name) ||
    left.section.localeCompare(right.section) ||
    left.type.localeCompare(right.type)
  );
}

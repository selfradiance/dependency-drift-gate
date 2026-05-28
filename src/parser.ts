import fs from "node:fs";
import path from "node:path";
import { packageJsonSchema, type PackageJsonInput } from "./schema.js";
import {
  DEPENDENCY_SECTIONS,
  type DependencyMap,
  type DependencySection,
  type PackageSnapshot,
  type StringMap
} from "./types.js";

export class PackageJsonReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackageJsonReadError";
  }
}

export function readPackageJson(filePath: string): PackageSnapshot {
  const resolvedPath = path.resolve(filePath);

  let content: string;
  try {
    content = fs.readFileSync(resolvedPath, "utf8");
  } catch (error) {
    throw new PackageJsonReadError(
      `Unable to read package.json at ${resolvedPath}: ${formatError(error)}`
    );
  }

  return parsePackageJsonContent(content, resolvedPath);
}

export function parsePackageJsonContent(
  content: string,
  sourcePath = "(inline)"
): PackageSnapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (error) {
    throw new PackageJsonReadError(
      `Invalid JSON in ${sourcePath}: ${formatError(error)}`
    );
  }

  const parsed = packageJsonSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new PackageJsonReadError(`Invalid package.json in ${sourcePath}: ${details}`);
  }

  return normalizePackageJson(parsed.data, sourcePath);
}

function normalizePackageJson(
  packageJson: PackageJsonInput,
  sourcePath: string
): PackageSnapshot {
  const dependencies = DEPENDENCY_SECTIONS.reduce((accumulator, section) => {
    accumulator[section] = sortStringMap(packageJson[section] ?? {});
    return accumulator;
  }, {} as DependencyMap);

  const snapshot: PackageSnapshot = {
    filePath: sourcePath,
    dependencies,
    scripts: sortStringMap(packageJson.scripts ?? {}),
    bin: normalizeBin(packageJson.bin, packageJson.name, sourcePath)
  };

  if (packageJson.name) {
    snapshot.packageName = packageJson.name;
  }

  return snapshot;
}

function normalizeBin(
  bin: PackageJsonInput["bin"],
  packageName: string | undefined,
  sourcePath: string
): StringMap {
  if (!bin) {
    return {};
  }

  if (typeof bin === "string") {
    if (!packageName) {
      throw new PackageJsonReadError(
        `Invalid package.json in ${sourcePath}: string bin requires a package name`
      );
    }

    return sortStringMap({ [packageName]: bin });
  }

  return sortStringMap(bin);
}

export function sortStringMap(values: StringMap): StringMap {
  return Object.fromEntries(
    Object.entries(values).sort(([left], [right]) => left.localeCompare(right))
  );
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function emptyDependencyMap(): DependencyMap {
  return DEPENDENCY_SECTIONS.reduce((accumulator, section: DependencySection) => {
    accumulator[section] = {};
    return accumulator;
  }, {} as DependencyMap);
}

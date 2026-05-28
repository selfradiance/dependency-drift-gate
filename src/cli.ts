#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyDrift } from "./classifier.js";
import { diffPackages } from "./diff.js";
import { readPackageJson } from "./parser.js";
import { buildReport, renderHumanReport, renderJsonReport } from "./report.js";

interface CliOptions {
  before: string;
  after: string;
  jsonOut?: string;
}

interface WritableLike {
  write(message: string): void;
}

interface CliIo {
  stdout: WritableLike;
  stderr: WritableLike;
}

export function runCli(
  argv = process.argv.slice(2),
  io: CliIo = { stdout: process.stdout, stderr: process.stderr }
): number {
  let options: CliOptions;

  try {
    options = parseArgs(argv);
  } catch (error) {
    io.stderr.write(`${formatError(error)}\n`);
    io.stderr.write(usage());
    return 1;
  }

  const beforePath = path.resolve(options.before);
  const afterPath = path.resolve(options.after);

  if (options.jsonOut) {
    const jsonOutPath = path.resolve(options.jsonOut);
    if (jsonOutPath === beforePath || jsonOutPath === afterPath) {
      io.stderr.write("--json-out must not overwrite either input file\n");
      return 1;
    }
  }

  try {
    const before = readPackageJson(beforePath);
    const after = readPackageJson(afterPath);
    const diff = diffPackages(before, after);
    const classification = classifyDrift(diff);
    const report = buildReport(before.filePath, after.filePath, diff, classification);

    io.stdout.write(renderHumanReport(report));

    if (options.jsonOut) {
      const jsonOutPath = path.resolve(options.jsonOut);
      fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
      fs.writeFileSync(jsonOutPath, renderJsonReport(report), "utf8");
    }

    return 0;
  } catch (error) {
    io.stderr.write(`${formatError(error)}\n`);
    return 1;
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--before") {
      if (!next || next.startsWith("--")) {
        throw new Error("--before requires a file path");
      }
      options.before = next;
      index += 1;
      continue;
    }

    if (arg === "--after") {
      if (!next || next.startsWith("--")) {
        throw new Error("--after requires a file path");
      }
      options.after = next;
      index += 1;
      continue;
    }

    if (arg === "--json-out") {
      if (!next || next.startsWith("--")) {
        throw new Error("--json-out requires a file path");
      }
      options.jsonOut = next;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg ?? ""}`);
  }

  if (!options.before || !options.after) {
    throw new Error("Missing required --before and --after arguments");
  }

  return {
    before: options.before,
    after: options.after,
    ...(options.jsonOut ? { jsonOut: options.jsonOut } : {})
  };
}

function usage(): string {
  return [
    "Usage:",
    "  dependency-drift-gate --before <package.json> --after <package.json> [--json-out <report.json>]",
    ""
  ].join("\n");
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentPath = fileURLToPath(import.meta.url);

if (invokedPath === currentPath) {
  process.exitCode = runCli();
}

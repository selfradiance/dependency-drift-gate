import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dependency-drift-gate-"));
  tempDirs.push(tempDir);
  return tempDir;
}

function writePackage(tempDir: string, fileName: string, value: unknown): string {
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
}

function captureRun(argv: string[]) {
  let stdout = "";
  let stderr = "";
  const code = runCli(argv, {
    stdout: { write: (message) => { stdout += message; } },
    stderr: { write: (message) => { stderr += message; } }
  });

  return { code, stdout, stderr };
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("cli", () => {
  it("returns nonzero for invalid args", () => {
    const result = captureRun([]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Missing required --before and --after arguments");
  });

  it("writes json-out reports", () => {
    const tempDir = makeTempDir();
    const before = writePackage(tempDir, "before.package.json", { dependencies: {} });
    const after = writePackage(tempDir, "after.package.json", { dependencies: { zod: "^4.0.0" } });
    const jsonOut = path.join(tempDir, ".dependency-drift-gate", "last-report.json");

    const result = captureRun(["--before", before, "--after", after, "--json-out", jsonOut]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Review label: review");
    const report = JSON.parse(fs.readFileSync(jsonOut, "utf8")) as { label: string };
    expect(report.label).toBe("review");
  });

  it("refuses json-out equal to before input", () => {
    const tempDir = makeTempDir();
    const before = writePackage(tempDir, "before.package.json", { dependencies: {} });
    const after = writePackage(tempDir, "after.package.json", { dependencies: {} });

    const result = captureRun(["--before", before, "--after", after, "--json-out", before]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--json-out must not overwrite either input file");
  });

  it("refuses json-out equal to after input", () => {
    const tempDir = makeTempDir();
    const before = writePackage(tempDir, "before.package.json", { dependencies: {} });
    const after = writePackage(tempDir, "after.package.json", { dependencies: {} });

    const result = captureRun(["--before", before, "--after", after, "--json-out", after]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--json-out must not overwrite either input file");
  });

  it("refuses json-out symlinked to an input file", () => {
    const tempDir = makeTempDir();
    const before = writePackage(tempDir, "before.package.json", { dependencies: {} });
    const after = writePackage(tempDir, "after.package.json", { dependencies: {} });
    const jsonOut = path.join(tempDir, "linked-report.json");
    fs.symlinkSync(before, jsonOut);

    const result = captureRun(["--before", before, "--after", after, "--json-out", jsonOut]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--json-out must not overwrite either input file");
    expect(JSON.parse(fs.readFileSync(before, "utf8"))).toEqual({ dependencies: {} });
  });
});

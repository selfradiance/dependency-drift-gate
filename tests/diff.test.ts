import { describe, expect, it } from "vitest";
import { diffPackages } from "../src/diff.js";
import { parsePackageJsonContent } from "../src/parser.js";

function parse(value: unknown) {
  return parsePackageJsonContent(JSON.stringify(value));
}

describe("diffPackages", () => {
  it("detects added dependencies", () => {
    const diff = diffPackages(parse({ dependencies: {} }), parse({ dependencies: { zod: "^4.0.0" } }));

    expect(diff.dependencyChanges).toEqual([
      {
        kind: "dependency",
        type: "added",
        section: "dependencies",
        name: "zod",
        afterVersion: "^4.0.0"
      }
    ]);
  });

  it("detects removed dependencies", () => {
    const diff = diffPackages(parse({ dependencies: { zod: "^4.0.0" } }), parse({ dependencies: {} }));

    expect(diff.dependencyChanges).toEqual([
      {
        kind: "dependency",
        type: "removed",
        section: "dependencies",
        name: "zod",
        beforeVersion: "^4.0.0"
      }
    ]);
  });

  it("detects changed dependency versions", () => {
    const diff = diffPackages(
      parse({ dependencies: { zod: "^4.0.0" } }),
      parse({ dependencies: { zod: "^4.1.0" } })
    );

    expect(diff.dependencyChanges).toEqual([
      {
        kind: "dependency",
        type: "changed",
        section: "dependencies",
        name: "zod",
        beforeVersion: "^4.0.0",
        afterVersion: "^4.1.0"
      }
    ]);
  });

  it("detects added scripts and bin entries", () => {
    const diff = diffPackages(
      parse({ scripts: {}, bin: {} }),
      parse({ scripts: { lint: "eslint ." }, bin: { tool: "./bin/tool.js" } })
    );

    expect(diff.scriptChanges).toEqual([
      {
        kind: "script",
        type: "added",
        name: "lint",
        afterScript: "eslint ."
      }
    ]);
    expect(diff.binChanges).toEqual([
      {
        kind: "bin",
        type: "added",
        name: "tool",
        afterEntry: "./bin/tool.js"
      }
    ]);
  });
});

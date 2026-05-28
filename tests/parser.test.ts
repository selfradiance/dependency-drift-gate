import { describe, expect, it } from "vitest";
import { parsePackageJsonContent } from "../src/parser.js";

describe("parser", () => {
  it("parses valid package.json sections", () => {
    const parsed = parsePackageJsonContent(
      JSON.stringify({
        name: "sample",
        dependencies: { zod: "^4.0.0" },
        devDependencies: { vitest: "^4.0.0" },
        optionalDependencies: { fsevents: "^2.0.0" },
        peerDependencies: { react: "^19.0.0" },
        scripts: { test: "vitest run" },
        bin: { sample: "./bin/sample.js" }
      })
    );

    expect(parsed.dependencies.dependencies).toEqual({ zod: "^4.0.0" });
    expect(parsed.dependencies.devDependencies).toEqual({ vitest: "^4.0.0" });
    expect(parsed.dependencies.optionalDependencies).toEqual({ fsevents: "^2.0.0" });
    expect(parsed.dependencies.peerDependencies).toEqual({ react: "^19.0.0" });
    expect(parsed.scripts).toEqual({ test: "vitest run" });
    expect(parsed.bin).toEqual({ sample: "./bin/sample.js" });
  });

  it("normalizes missing optional sections to empty maps", () => {
    const parsed = parsePackageJsonContent(JSON.stringify({ name: "sample" }));

    expect(parsed.dependencies.dependencies).toEqual({});
    expect(parsed.dependencies.devDependencies).toEqual({});
    expect(parsed.dependencies.optionalDependencies).toEqual({});
    expect(parsed.dependencies.peerDependencies).toEqual({});
    expect(parsed.scripts).toEqual({});
    expect(parsed.bin).toEqual({});
  });

  it("handles string bin entries using the package name", () => {
    const parsed = parsePackageJsonContent(
      JSON.stringify({ name: "sample", bin: "./bin/sample.js" })
    );

    expect(parsed.bin).toEqual({ sample: "./bin/sample.js" });
  });

  it("rejects invalid package JSON", () => {
    expect(() => parsePackageJsonContent("{")).toThrow(/Invalid JSON/);
    expect(() => parsePackageJsonContent(JSON.stringify({ dependencies: [] }))).toThrow(
      /Invalid package\.json/
    );
  });
});

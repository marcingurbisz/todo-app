import { describe, expect, it } from "vitest";
import { buildFileTree, getAncestorPaths, getParentDirectory, normalizePath } from "./tree";

describe("tree helpers", () => {
  it("normalizes user-entered paths", () => {
    expect(normalizePath(" //alpha\\beta//note.md ")).toBe("alpha/beta/note.md");
  });

  it("returns ancestor directories for a file path", () => {
    expect(getAncestorPaths("alpha/beta/note.md")).toEqual(["alpha", "alpha/beta"]);
  });

  it("returns the parent directory of a file", () => {
    expect(getParentDirectory("alpha/beta/note.md")).toBe("alpha/beta");
  });

  it("builds a nested tree with directories sorted before files", () => {
    const tree = buildFileTree([
      { path: "zeta.md", sha: "1", mode: "100644" },
      { path: "alpha/second.md", sha: "2", mode: "100644" },
      { path: "alpha/first.md", sha: "3", mode: "100644" },
    ]);

    expect(tree.map((node) => node.path)).toEqual(["alpha", "zeta.md"]);
    expect(tree[0].children.map((node) => node.path)).toEqual(["alpha/first.md", "alpha/second.md"]);
  });
});

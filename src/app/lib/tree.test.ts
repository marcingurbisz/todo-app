import { describe, expect, it } from "vitest";
import { buildFileTree, filterFileTree, getAncestorPaths, getParentDirectory, normalizePath } from "./tree";

describe("tree helpers", () => {
  it("normalizes user-entered paths", () => {
    expect(normalizePath("//alpha\\beta//note.md")).toBe("alpha/beta/note.md");
  });

  it("preserves whitespace that is part of a repository filename", () => {
    expect(normalizePath("__today/zażółć gęślą jaźń ")).toBe("__today/zażółć gęślą jaźń ");
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

  it("carries the blob SHA into a Unicode file node without another path lookup", () => {
    const decomposedName = "zażółć-gęślą-jaźń ";
    const tree = buildFileTree([
      { path: `__today/${decomposedName}`, sha: "unicode-blob-sha", mode: "100644" },
    ]);

    expect(tree[0].children[0]).toMatchObject({
      kind: "file",
      path: `__today/${decomposedName}`,
      sha: "unicode-blob-sha",
    });
  });

  it("sorts top-level workflow directories by semantic priority", () => {
    const tree = buildFileTree([
      { path: "review-every-weekend/health.md", sha: "1", mode: "100644" },
      { path: "_short-term/idea.md", sha: "2", mode: "100644" },
      { path: "__today/task.md", sha: "3", mode: "100644" },
      { path: "__now/focus.md", sha: "4", mode: "100644" },
      { path: "zeta.md", sha: "5", mode: "100644" },
    ]);

    expect(tree.map((node) => node.path)).toEqual([
      "__now",
      "__today",
      "_short-term",
      "review-every-weekend",
      "zeta.md",
    ]);
  });

  it("filters the tree by path while preserving matching directory branches", () => {
    const tree = buildFileTree([
      { path: "__today/plan-alpha.md", sha: "1", mode: "100644" },
      { path: "__today/plan-beta.md", sha: "2", mode: "100644" },
      { path: "_short-term/backlog.md", sha: "3", mode: "100644" },
    ]);

    const filteredTree = filterFileTree(tree, "beta");

    expect(filteredTree.map((node) => node.path)).toEqual(["__today"]);
    expect(filteredTree[0].kind).toBe("directory");
    expect(filteredTree[0].children.map((node) => node.path)).toEqual(["__today/plan-beta.md"]);
  });
});

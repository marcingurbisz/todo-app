import type { FileTreeNode, RepoFileEntry } from "../types";

function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  nodes.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "directory" ? -1 : 1;
    }

    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  });

  for (const node of nodes) {
    if (node.kind === "directory") {
      sortNodes(node.children);
    }
  }

  return nodes;
}

export function normalizePath(value: string): string {
  return value
    .replace(/\\/g, "/")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

export function getAncestorPaths(path: string): string[] {
  const parts = normalizePath(path).split("/").filter(Boolean);
  const ancestors: string[] = [];

  for (let index = 1; index < parts.length; index += 1) {
    ancestors.push(parts.slice(0, index).join("/"));
  }

  return ancestors;
}

export function getParentDirectory(path: string): string {
  const normalizedPath = normalizePath(path);
  const lastSlashIndex = normalizedPath.lastIndexOf("/");

  return lastSlashIndex === -1 ? "" : normalizedPath.slice(0, lastSlashIndex);
}

export function buildFileTree(entries: RepoFileEntry[]): FileTreeNode[] {
  const rootNodes: FileTreeNode[] = [];

  function ensureDirectory(children: FileTreeNode[], name: string, path: string): FileTreeNode {
    const existing = children.find((node) => node.kind === "directory" && node.name === name);

    if (existing) {
      return existing;
    }

    const nextDirectory: FileTreeNode = {
      kind: "directory",
      name,
      path,
      children: [],
    };

    children.push(nextDirectory);
    return nextDirectory;
  }

  function upsertFile(children: FileTreeNode[], name: string, path: string) {
    const existing = children.find((node) => node.kind === "file" && node.name === name);

    if (existing) {
      return;
    }

    children.push({
      kind: "file",
      name,
      path,
      children: [],
    });
  }

  for (const entry of entries) {
    const parts = normalizePath(entry.path).split("/").filter(Boolean);
    let currentChildren = rootNodes;
    let currentPath = "";

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === parts.length - 1;

      if (isFile) {
        upsertFile(currentChildren, part, currentPath);
      } else {
        const directory = ensureDirectory(currentChildren, part, currentPath);
        currentChildren = directory.children;
      }
    }
  }

  return sortNodes(rootNodes);
}

export interface RepoSettings {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

export interface RepoFileEntry {
  path: string;
  sha: string;
  mode: string;
}

export interface FileTreeNode {
  kind: "file" | "directory";
  name: string;
  path: string;
  children: FileTreeNode[];
}

export interface RepoSnapshot {
  headSha: string;
  treeSha: string;
  files: RepoFileEntry[];
  tree: FileTreeNode[];
}

export interface CommitChange {
  path: string;
  content?: string;
  delete?: boolean;
}

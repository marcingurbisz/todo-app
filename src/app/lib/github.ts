import type { CommitChange, RepoFileEntry, RepoSettings, RepoSnapshot } from "../types";
import { buildFileTree, normalizePath } from "./tree";

interface GitReferenceResponse {
  object: {
    sha: string;
  };
}

interface GitCommitResponse {
  tree: {
    sha: string;
  };
}

interface GitTreeResponse {
  tree: Array<{
    path: string;
    mode: string;
    sha: string;
    type: string;
  }>;
}

interface GitBlobResponse {
  sha: string;
}

const HEAD_SYNC_ATTEMPTS = 8;
const HEAD_SYNC_DELAY_MS = 250;

interface FileContentResponse {
  content: string;
  encoding: string;
}

class GitHubApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function branchPath(branch: string): string {
  return branch
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function contentPath(path: string): string {
  return normalizePath(path)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function decodeBase64Utf8(value: string): string {
  const sanitizedValue = value.replace(/\n/g, "");
  const binary = atob(sanitizedValue);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

async function apiRequest<Response>(
  settings: RepoSettings,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(`https://api.github.com/repos/${settings.owner}/${settings.repo}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${settings.token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new GitHubApiError(errorText || response.statusText, response.status);
  }

  return (await response.json()) as Response;
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

async function waitForBranchHead(settings: RepoSettings, expectedSha: string): Promise<void> {
  for (let attempt = 0; attempt < HEAD_SYNC_ATTEMPTS; attempt += 1) {
    const reference = await apiRequest<GitReferenceResponse>(
      settings,
      `/git/ref/heads/${branchPath(settings.branch)}`,
    );

    if (reference.object.sha === expectedSha) {
      return;
    }

    await delay(HEAD_SYNC_DELAY_MS);
  }
}

function formatApiError(error: unknown): Error {
  if (error instanceof GitHubApiError) {
    if (error.status === 401 || error.status === 403) {
      return new Error("GitHub rejected the request. Check the token and its repository permissions.");
    }

    if (error.status === 404) {
      return new Error("Repository, branch, or file was not found. Check the configured owner, repo, and branch.");
    }

    if (error.status === 422) {
      return new Error(
        "The remote branch moved before the commit could be published. Refresh the repository and retry the action.",
      );
    }

    return new Error(`GitHub API error (${error.status}): ${error.message}`);
  }

  return error instanceof Error ? error : new Error("Unexpected GitHub API error.");
}

export async function loadRepository(settings: RepoSettings): Promise<RepoSnapshot> {
  try {
    const reference = await apiRequest<GitReferenceResponse>(
      settings,
      `/git/ref/heads/${branchPath(settings.branch)}`,
    );
    const headSha = reference.object.sha;
    const commit = await apiRequest<GitCommitResponse>(settings, `/git/commits/${headSha}`);
    const treeSha = commit.tree.sha;
    const tree = await apiRequest<GitTreeResponse>(settings, `/git/trees/${treeSha}?recursive=1`);
    const files: RepoFileEntry[] = tree.tree
      .filter((entry) => entry.type === "blob")
      .map((entry) => ({
        path: entry.path,
        sha: entry.sha,
        mode: entry.mode,
      }));

    return {
      headSha,
      treeSha,
      files,
      tree: buildFileTree(files),
    };
  } catch (error) {
    throw formatApiError(error);
  }
}

export async function readFileContent(settings: RepoSettings, path: string): Promise<string> {
  try {
    const file = await apiRequest<FileContentResponse>(
      settings,
      `/contents/${contentPath(path)}?ref=${encodeURIComponent(settings.branch)}`,
    );

    if (file.encoding !== "base64") {
      throw new Error(`Unsupported file encoding: ${file.encoding}`);
    }

    return decodeBase64Utf8(file.content);
  } catch (error) {
    throw formatApiError(error);
  }
}

export async function commitRepositoryChanges(
  settings: RepoSettings,
  options: {
    baseCommitSha: string;
    baseTreeSha: string;
    message: string;
    changes: CommitChange[];
  },
): Promise<string> {
  try {
    const blobEntries = await Promise.all(
      options.changes
        .filter((change) => !change.delete)
        .map(async (change) => {
          const blob = await apiRequest<GitBlobResponse>(settings, "/git/blobs", {
            method: "POST",
            body: JSON.stringify({
              content: encodeBase64Utf8(change.content ?? ""),
              encoding: "base64",
            }),
          });

          return {
            path: normalizePath(change.path),
            mode: "100644",
            type: "blob",
            sha: blob.sha,
          };
        }),
    );

    const deletionEntries = options.changes
      .filter((change) => change.delete)
      .map((change) => ({
        path: normalizePath(change.path),
        mode: "100644",
        type: "blob",
        sha: null,
      }));

    const nextTree = await apiRequest<GitBlobResponse>(settings, "/git/trees", {
      method: "POST",
      body: JSON.stringify({
        base_tree: options.baseTreeSha,
        tree: [...blobEntries, ...deletionEntries],
      }),
    });

    const commit = await apiRequest<GitBlobResponse>(settings, "/git/commits", {
      method: "POST",
      body: JSON.stringify({
        message: options.message,
        tree: nextTree.sha,
        parents: [options.baseCommitSha],
      }),
    });

    await apiRequest(settings, `/git/refs/heads/${branchPath(settings.branch)}`, {
      method: "PATCH",
      body: JSON.stringify({
        sha: commit.sha,
        force: false,
      }),
    });

    await waitForBranchHead(settings, commit.sha);

    return commit.sha;
  } catch (error) {
    throw formatApiError(error);
  }
}

import { afterAll, describe, expect, it } from "vitest";
import { commitRepositoryChanges, loadRepository, readFileContent } from "./github";
import type { RepoSettings } from "../types";

interface GitReferenceResponse {
  object: {
    sha: string;
  };
}

const owner = process.env.TODO_APP_TEST_OWNER ?? "marcingurbisz";
const repo = process.env.TODO_APP_TEST_REPO ?? "todo-app-test";
const baseBranch = process.env.TODO_APP_TEST_BASE_BRANCH ?? "main";
const token = process.env.TODO_APP_TEST_TOKEN;
const runLiveTests = process.env.TODO_APP_LIVE_E2E === "1";
const branchName = process.env.TODO_APP_TEST_BRANCH ?? `e2e-${Date.now()}`;

const skipReason = !runLiveTests
  ? "Set TODO_APP_LIVE_E2E=1 to enable live-repository automation."
  : !token
    ? "Set TODO_APP_TEST_TOKEN to run the live GitHub automation against todo-app-test."
    : null;

const maybeDescribe = skipReason ? describe.skip : describe;

function apiHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function githubRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...apiHeaders(),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${text || response.statusText}`);
  }

  return (await response.json()) as T;
}

async function getBranchHead(branch: string): Promise<string> {
  const reference = await githubRequest<GitReferenceResponse>(`/git/ref/heads/${encodeURIComponent(branch)}`);
  return reference.object.sha;
}

async function createBranchFromBase(branch: string): Promise<void> {
  const baseSha = await getBranchHead(baseBranch);
  await githubRequest("/git/refs", {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha: baseSha,
    }),
  });
}

async function deleteBranch(branch: string): Promise<void> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
    {
      method: "DELETE",
      headers: apiHeaders(),
    },
  );

  if (response.status === 204 || response.status === 404) {
    return;
  }

  const text = await response.text();
  throw new Error(`Failed to delete branch ${branch}: ${response.status} ${text || response.statusText}`);
}

function liveSettings(): RepoSettings {
  if (!token) {
    throw new Error("TODO_APP_TEST_TOKEN is required for live-repo automation.");
  }

  return {
    owner,
    repo,
    branch: branchName,
    token,
  };
}

function fileAt(snapshot: Awaited<ReturnType<typeof loadRepository>>, path: string) {
  const file = snapshot.files.find((entry) => entry.path === path);

  if (!file) {
    throw new Error(`Expected ${path} in the repository snapshot.`);
  }

  return file;
}

maybeDescribe("live GitHub repository flow", () => {
  if (skipReason) {
    it.skip(skipReason, () => undefined);
    return;
  }

  const settings = liveSettings();
  const fileName = "e2e-zażółć-gęślą-jaźń.md";
  const createdPath = `__today/${fileName}`;
  const movedPath = `_short-term/${fileName}`;

  afterAll(async () => {
    await deleteBranch(branchName);
  });

  it("creates, edits, moves, and deletes a file on a disposable branch", async () => {
    await createBranchFromBase(branchName);

    const initialSnapshot = await loadRepository(settings);
    expect(initialSnapshot.files.some((entry) => entry.path === createdPath)).toBe(false);
    expect(initialSnapshot.files.some((entry) => entry.path === movedPath)).toBe(false);

    await commitRepositoryChanges(settings, {
      baseCommitSha: initialSnapshot.headSha,
      baseTreeSha: initialSnapshot.treeSha,
      message: "E2E create test file",
      changes: [{ path: createdPath, content: "# E2E created\n\nstep=create" }],
    });

    const createdSnapshot = await loadRepository(settings);
    expect(createdSnapshot.headSha).not.toBe(initialSnapshot.headSha);
    expect(createdSnapshot.files.some((entry) => entry.path === createdPath)).toBe(true);
    expect(await readFileContent(settings, fileAt(createdSnapshot, createdPath))).toContain("step=create");

    await commitRepositoryChanges(settings, {
      baseCommitSha: createdSnapshot.headSha,
      baseTreeSha: createdSnapshot.treeSha,
      message: "E2E edit test file",
      changes: [{ path: createdPath, content: "# E2E created\n\nstep=edit" }],
    });

    const editedSnapshot = await loadRepository(settings);
    expect(editedSnapshot.headSha).not.toBe(createdSnapshot.headSha);
    expect(await readFileContent(settings, fileAt(editedSnapshot, createdPath))).toContain("step=edit");

    await commitRepositoryChanges(settings, {
      baseCommitSha: editedSnapshot.headSha,
      baseTreeSha: editedSnapshot.treeSha,
      message: "E2E move test file",
      changes: [
        { path: createdPath, delete: true },
        { path: movedPath, content: "# E2E moved\n\nstep=move" },
      ],
    });

    const movedSnapshot = await loadRepository(settings);
    expect(movedSnapshot.headSha).not.toBe(editedSnapshot.headSha);
    expect(movedSnapshot.files.some((entry) => entry.path === createdPath)).toBe(false);
    expect(movedSnapshot.files.some((entry) => entry.path === movedPath)).toBe(true);
    expect(await readFileContent(settings, fileAt(movedSnapshot, movedPath))).toContain("step=move");

    await commitRepositoryChanges(settings, {
      baseCommitSha: movedSnapshot.headSha,
      baseTreeSha: movedSnapshot.treeSha,
      message: "E2E delete test file",
      changes: [{ path: movedPath, delete: true }],
    });

    const finalSnapshot = await loadRepository(settings);
    expect(finalSnapshot.files.some((entry) => entry.path === createdPath)).toBe(false);
    expect(finalSnapshot.files.some((entry) => entry.path === movedPath)).toBe(false);
  }, 120000);
});

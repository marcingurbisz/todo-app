import { test, expect } from "@playwright/test";

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
const branchName = process.env.TODO_APP_TEST_BRANCH ?? `e2e-ui-${Date.now()}`;

test.skip(!runLiveTests, "Set TODO_APP_LIVE_E2E=1 to enable live UI automation.");
test.skip(!token, "Set TODO_APP_TEST_TOKEN to run live UI automation.");

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

test.describe("live browser flow", () => {
  const uniqueSuffix = Date.now().toString();
  const initialFileName = `e2e-ui-${uniqueSuffix}.md`;
  const movedPath = `_short-term/${initialFileName}`;
  const initialPath = `__today/${initialFileName}`;

  test.beforeAll(async () => {
    await createBranchFromBase(branchName);
  });

  test.afterAll(async () => {
    await deleteBranch(branchName);
  });

  test("creates, edits, moves, and deletes through the UI", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByLabel("Owner", { exact: true })).toHaveValue("marcingurbisz");
    await expect(page.getByLabel("Repository", { exact: true })).toHaveValue("todo");
    await expect(page.getByLabel("Branch", { exact: true })).toHaveValue("main");
    await page.getByLabel("Owner", { exact: true }).fill(owner);
    await page.getByLabel("Repository", { exact: true }).fill(repo);
    await page.getByLabel("Branch", { exact: true }).fill(branchName);
    await page.getByLabel("GitHub token", { exact: true }).fill(token!);
    await page.getByRole("button", { name: "Save setup and load repository" }).click();

    await expect(page.getByText("Loaded", { exact: false })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /files/i })).toBeVisible();

    await page.getByRole("button", { name: "Create file" }).click();
    const createDialog = page.getByLabel("Create file dialog");
    await expect(createDialog.getByLabel("File name", { exact: true })).toHaveValue("");
    await createDialog.locator("select").selectOption("__today");
    await createDialog.getByLabel("File name", { exact: true }).fill(initialFileName);
    await createDialog.getByRole("button", { name: "Create with commit" }).click();

    await expect(page.getByText("Published successfully.", { exact: false })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /files/i })).toBeVisible();
    await page.getByRole("button", { name: initialFileName.replace(/\.md$/, ""), exact: true }).click();
    await expect(page.getByRole("heading", { name: initialPath })).toBeVisible({ timeout: 60_000 });

    await page.getByRole("button", { name: "Raw" }).click();
    await page.getByLabel("File contents").fill("# UI live test\n\nstatus=edit");
    await page.getByRole("button", { name: "Save commit" }).click();
    await expect(page.getByText("Published successfully.", { exact: false })).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: /files/i })).toBeVisible();
    await page.getByRole("button", { name: initialFileName.replace(/\.md$/, ""), exact: true }).click();

    await page.getByRole("button", { name: "Move", exact: true }).click();
    await page.getByLabel("Move file").getByRole("button", { name: /_short-term\/.*suggested/ }).click();
    await expect(page.getByText("Published successfully.", { exact: false })).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: initialFileName.replace(/\.md$/, ""), exact: true }).click();
    await expect(page.getByRole("heading", { name: movedPath })).toBeVisible({ timeout: 60_000 });

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByLabel("Delete file dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Published successfully.", { exact: false })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /files/i })).toBeVisible({ timeout: 60_000 });
  });
});

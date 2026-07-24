import { expect, test } from "@playwright/test";

const files = [
  { path: "__now/fix-production-alert.md", sha: "blob-now" },
  { path: "__today/write-trello-to-markdown-post.md", sha: "blob-post" },
  { path: "__today/review-agent-pr.md", sha: "blob-review" },
  { path: "__today/tomorrow/book-flights.md", sha: "blob-flights" },
  { path: "_short-term/ship-todo-android-app.md", sha: "blob-app" },
  { path: "_short-term/reviewed/refresh-personal-site.md", sha: "blob-site" },
  { path: "review-every-weekend/reviewed/plan-next-week.md", sha: "blob-week" },
];

const contents: Record<string, string> = {
  "blob-post": `# Why I moved my TODOs from Trello to Markdown

The task is ready for delegation to an agent.

## Notes

- explain why folders represent status
- show the Android app
- link to the Git repository
`,
};

test("captures deterministic README screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.localStorage.setItem("todo-app.settings", JSON.stringify({
      owner: "demo",
      repo: "todo",
      branch: "main",
      token: "screenshot-token",
    }));
  });
  await page.route("https://api.github.com/repos/demo/todo/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname.includes("/git/ref/heads/main")) {
      await route.fulfill({ json: { object: { sha: "head1234567890" } } });
      return;
    }

    if (pathname.endsWith("/git/commits/head1234567890")) {
      await route.fulfill({ json: { tree: { sha: "tree1234567890" } } });
      return;
    }

    if (pathname.endsWith("/git/trees/tree1234567890")) {
      await route.fulfill({
        json: {
          tree: files.map((file) => ({
            ...file,
            mode: "100644",
            type: "blob",
          })),
        },
      });
      return;
    }

    const blobSha = pathname.split("/").at(-1) ?? "";
    await route.fulfill({
      json: {
        content: Buffer.from(contents[blobSha] ?? "# Demo task\n").toString("base64"),
        encoding: "base64",
      },
    });
  });

  await page.goto("/");
  await expect(page.getByText("Loaded 7 files", { exact: false })).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: "docs/images/todo-tree.png",
  });

  await page.getByRole("button", { name: "write-trello-to-markdown-post", exact: true }).click();
  await expect(page.getByRole("heading", { name: "__today/write-trello-to-markdown-post.md" })).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: "docs/images/markdown-editor.png",
  });

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Select files" }).click();
  await page.getByRole("button", { name: "write-trello-to-markdown-post", exact: true }).click();
  await page.getByRole("button", { name: "review-agent-pr", exact: true }).click();
  await expect(page.getByRole("heading", { name: "2 selected" })).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: "docs/images/multi-select.png",
  });
});

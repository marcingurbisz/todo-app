# todo-app

Mobile-first TODO repository client for the private `todo` GitHub repository.

The app is meant to give fast Android access to the existing file-based TODO system without changing the storage format. The app reads the repository tree, lets the user edit or move files, and publishes every confirmed change back to GitHub.

## Product context

This app is designed for one private TODO workflow, not as a collaborative multi-user product. The expected usage is a single user operating on a private repository with a directory layout optimized around daily movement of markdown notes between a few high-traffic folders.

Representative repository shape:

```text
todo/
  __now/
    todo-app.md
  __today/
    flowlite.md
    mails.md
    publishing.md
    tomorrow/
      settle-the-tax
  _short-term/
    reviewed/
      ief.md
      how-to-live-well.md
      always-on-agent-with-access-to-repo.md
  review-every-weekend/
    reviewed/
      kuba-badania.md
      health.md
  review-every-zmonth/
```

Core workflows for the app:

- move files between directories in 2 clicks
- treat the file tree as the primary landing view after setup
- open a markdown file into an editable preview with optional raw mode
- publish each confirmed change directly to the repository

## Product goals

- Browse all TODO files and directories.
- Open and edit text files.
- Create, rename, move, and delete files or folders.
- Publish each change to the repository immediately.
- Stay usable on Android first, desktop second.

## MVP scope

- Authentication is done with a GitHub personal access token entered in app settings.
- The app works against a repository and branch provided during first-run setup.
- Each mutating action creates a commit in the target repository.
- Before each mutating action, the app refreshes the latest branch head.
- If the branch moved since the last loaded state and the update cannot be fast-forwarded, the app stops and asks the user to refresh.

This keeps concurrent update handling simple for phase one while avoiding silent overwrites.

## Architecture

## UI shell

- React and TypeScript single-page app.
- Vite for local development and production builds.
- Capacitor-ready structure so the web app can later be wrapped as an Android application.

## Data flow

1. Load repository settings from local storage.
2. Call GitHub REST API to read the branch head, tree, and file contents.
3. Build an in-memory file tree for browsing.
4. On change, create a git tree delta and commit through the GitHub Git Data API.
5. Update the branch reference with `force=false` so concurrent changes fail instead of overwriting remote history.
6. Refresh local state from the new head.

## Concurrency model

- Refresh often.
- Reject writes if the branch head changed since the last synced state.
- Ask the user to reload before retrying.

Detailed practical guidance for mobile conflict handling and VS Code sync habits lives in `docs/concurrency-guidance.md`.

## Security notes

- The MVP stores repository settings in browser storage for speed of implementation.
- For a Play Store release, the token should move to native secure storage.
- The token should be fine-grained and limited to the target repository.

## Development notes

- Local development will use `npm`, Vite, and the browser.
- Android packaging is planned via Capacitor after the web app flow is verified.
- Automatic tests should cover repository tree transforms and GitHub API request shaping. Manual exploratory testing should cover real sync behavior with a test repository.

## Local development

```bash
npm install
npm run dev
```

Production build and current unit tests:

```bash
npm run build
npm test
```

## Verification strategy

What can be verified in the current devcontainer without extra secrets:

- TypeScript compilation and production bundling.
- Unit tests for path normalization and repository tree shaping.
- Browser smoke testing of the responsive UI shell, editor flow, and settings flow.

What still needs a real GitHub-backed test run:

- reading the private repository with a real token
- committing file edits to GitHub
- moving files across directories and checking resulting commits
- delete flows against a disposable repository state
- concurrency rejection when the branch head moves between load and publish

Recommended test setup for safe end-to-end verification:

- a dedicated `todo-test` repository or a dedicated test branch in the private `todo` repository
- a fine-grained token with contents access limited to that test target
- a small fixture tree with nested directories and markdown files

Automatic tests for the current project should stay pragmatic and close to the real repository workflow:

- automated tests can run against separate branches of `todo-app-test`, for example one branch for repeatable scripted checks and another for freer exploratory work
- the most valuable automated coverage is around real create, edit, move, delete, and reload flows against disposable repository state
- a smaller amount of local unit coverage is still useful for deterministic path and tree transformations that do not need GitHub access

> MG: Not sure if we need that. Don't you think that automatic tests that use real todo-app-test repo + exploratory/free test on that repo are enough? Automatic and exploratory tests can you two different branches of todo-app-test.
> Agent: Agreed for this project phase. The README now treats real-repository testing on separate `todo-app-test` branches as the primary strategy, with only lightweight local unit tests for pure helper logic.

Exploratory test checklist:

- load the repo and verify file counts and folder nesting
- open several files and confirm editor content matches GitHub contents
- edit and save a file, then confirm the commit appears in GitHub
- move a file to a new path and confirm the old path disappears
- delete a file and confirm the tree refreshes correctly

## Publish to Google Play

The current codebase is ready for local browser use and internal Android packaging work, but not yet for a public Play Store release as-is.

The detailed release path, store-submission checks, and practical recommendation now live in `docs/google-play-release.md`.
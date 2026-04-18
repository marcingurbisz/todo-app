# todo-app

Mobile-first TODO repository client for the private `todo` GitHub repository.

The app is meant to give fast Android access to the existing file-based TODO system without changing the storage format. Files remain the source of truth. The app reads the repository tree, lets the user edit or move files, and publishes every confirmed change back to GitHub.

## Product goals

- Browse all TODO files and directories.
- Open and edit text files.
- Create, rename, move, and delete files or folders.
- Publish each change to the repository immediately.
- Stay usable on Android first, desktop second.

## MVP scope

The first implementation targets one user and one repository.

- Authentication is done with a GitHub personal access token entered in app settings.
- The app works against a configured repository and branch, defaulting to `marcingurbisz/todo` on `main`.
- Each mutating action creates a commit in the target repository.
- Before each mutating action, the app refreshes the latest branch head.
- If the branch moved since the last loaded state and the update cannot be fast-forwarded, the app stops and asks the user to refresh.

This keeps concurrent update handling simple for phase one while avoiding silent overwrites.

## Architecture

## UI shell

- React and TypeScript single-page app.
- Vite for local development and production builds.
- Capacitor-ready structure so the web app can later be wrapped as an Android application.
- Mobile-first split view:
  - repository tree and actions
  - editor/details panel
  - sync and repository status area

## Data flow

1. Load repository settings from local storage.
2. Call GitHub REST API to read the branch head, tree, and file contents.
3. Build an in-memory file tree for browsing.
4. On change, create a git tree delta and commit through the GitHub Git Data API.
5. Update the branch reference with `force=false` so concurrent changes fail instead of overwriting remote history.
6. Refresh local state from the new head.

## Why Git Data API instead of cloning in the app

- It fits the requirement that every change is published immediately.
- It keeps the Android client simpler than embedding full git plumbing from day one.
- Move and delete can be expressed as one commit together with related edits.
- Fast-forward ref updates provide a clean base for later concurrency improvements.

## Concurrency model

Phase one:

- Refresh often.
- Reject writes if the branch head changed since the last synced state.
- Ask the user to reload before retrying.

Phase two candidates:

- background polling or pull-on-resume
- optimistic merge helpers for non-overlapping file edits
- branch-based draft changes before publish

## Planned structure

```text
todo-app/
  src/
    app/
      App.tsx
      components/
      hooks/
      lib/
      styles/
      types/
    main.tsx
  public/
  README.md
  TODO.md
```

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

Automatic test concepts for the next phase:

- unit tests for commit payload generation for create, edit, move, and delete actions
- integration tests with mocked GitHub API responses for load, read, publish success, and publish conflict paths
- UI tests for file selection, unsaved changes prompts, and settings persistence

Exploratory test checklist:

- load the repo and verify file counts and folder nesting
- open several files and confirm editor content matches GitHub contents
- edit and save a file, then confirm the commit appears in GitHub
- move a file to a new path and confirm the old path disappears
- delete a file and confirm the tree refreshes correctly
- create a concurrent change from another machine, then verify the app rejects the stale publish and requires refresh
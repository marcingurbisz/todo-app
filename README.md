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
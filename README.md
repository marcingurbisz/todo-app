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

> MG: I do not foresee now that this app will be used by many users against the same repo. This todo app is for private todos. I think it's worth to add such note here or maybe even somewhere above.

- Authentication is done with a GitHub personal access token entered in app settings.
- The app works against a configured repository and branch, defaulting to `marcingurbisz/todo` on `main`.

> MG: Should be no default. Should be always provided during setup.

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

> MG: Not sure if we need that. Don't you think that automatic tests that use real todo-app-test repo + exploratory/free test on that repo are enough? Automatic and exploratory tests can you two different branches of todo-app-test.

Exploratory test checklist:

- load the repo and verify file counts and folder nesting
- open several files and confirm editor content matches GitHub contents
- edit and save a file, then confirm the commit appears in GitHub
- move a file to a new path and confirm the old path disappears
- delete a file and confirm the tree refreshes correctly

## Publish to Google Play

The current codebase is ready for local browser use and internal Android packaging work, but not yet for a public Play Store release as-is. The main release blocker is authentication storage: the MVP keeps the GitHub token in browser storage, while a store build should use native secure storage and ideally a safer auth model than a personal access token embedded in a client app.

### Recommended release path

1. Add Capacitor packages:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

2. Initialize Capacitor in the project:

```bash
npx cap init todo-app com.marcingurbisz.todoapp --web-dir=dist
```

3. Add the Android platform:

```bash
npx cap add android
```

4. Build the web app and sync it into the Android wrapper:

```bash
npm run build
npx cap sync android
```

5. Open the Android project in Android Studio:

```bash
npx cap open android
```

6. In Android Studio:

- set the final application ID
- set app name, launcher icon, and adaptive icon
- set `versionCode` and `versionName`
- confirm min SDK and target SDK meet Play requirements
- create a signed app bundle (`.aab`)

7. In Google Play Console:

- create the app entry
- complete store listing, screenshots, icon, feature graphic, and content rating
- provide a privacy policy
- complete Data safety disclosures
- upload the signed `.aab` to an internal testing track first
- validate install, login/token setup, sync, edit, move, and delete flows on a physical Android device
- promote to closed or production only after internal testing is stable

### Release-readiness checks before store submission

- move token storage from `localStorage` to native secure storage
- define what happens when a token expires or is revoked
- consider replacing personal access tokens with a GitHub App or backend-mediated auth flow
- add device-level exploratory testing on real Android hardware
- verify accessibility for touch targets, keyboard, and text scaling
- test offline, slow network, and API failure cases

### Practical recommendation

For the current MVP, the safest route is:

- use the web app locally now
- package to Android for personal use or internal testing
- delay public Play release until the auth and secure-storage story is upgraded
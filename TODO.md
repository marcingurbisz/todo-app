# Initial idea

I miss the TODO app that gives me the good access to my todos on my android. My todos are stored as files in [todo](../todo/) dir which is also private github repo.

Requirements:
* I see the all todo files and dirs
* I can move files between directories
* I can edit and delete files
* Each change is published to the repo
* How to deal with concurrent updates? I also modify todo repo from my laptop.
  * I would pull changes from repo quite often to minimize the needs for merges
  * this can be moved to phase two of the project

# TODO

## [DONE 2026-04-18.1] Init, commit and push todo-app to just created by me empty https://github.com/marcingurbisz/todo-app

> Agent: The `todo-app` directory was initialized as a standalone git repository on `main`, `origin` was set to `https://github.com/marcingurbisz/todo-app.git`, and the initial commit was pushed successfully.
> Changes: Added the first repo commit with the TODO ledger and connected the repo to GitHub.
> Validation: Verified local repo creation, commit creation, branch tracking, and a successful push to `origin/main`.

## [DONE 2026-04-18.1] Prepare README.md and planned architecture base on "Initial idea"
... in [todo-app](../../todo-app) dir.

> Agent: Added `README.md` with the MVP scope, mobile-first architecture, GitHub sync strategy, concurrency approach, and planned project structure.
> Changes: Documented a React + TypeScript + Vite client packaged later with Capacitor and using the GitHub Git Data API for immediate commits.
> Validation: Checked the repository state after adding the README and aligned the documented design with every requirement from the initial idea.

## [DONE 2026-04-18.1] Implement

> Agent: Implemented a mobile-first React + TypeScript app that loads a GitHub repository tree, opens files for editing, creates files, moves or renames files across directories, deletes files, and publishes each mutation as a commit through the GitHub Git Data API.
> Changes: Added the Vite project scaffold, repository settings storage, GitHub API client, file tree utilities, responsive UI, and initial unit tests for tree/path behavior.
> Validation: Installed dependencies, ran `npm run build`, and ran `npm test` successfully after fixing the first-pass tree builder bug.

## [DONE 2026-04-18.1] Think about verification
How can you test what you've just implemented? Do you have all that you need or I need to install something for you to the devcontainer that you are using?
Do you need github todo-test repo or it is not needed?
If you have everything you need do the tests or at least try to test/verify what you can.
Describe the concept for automatic tests and exploratory tests done by you for this project.

> Agent: The current devcontainer already had everything needed for local build, test, and browser smoke testing. No extra packages were required.
> Changes: Tightened the build so it no longer emits tracked TypeScript artifacts, added verification guidance to `README.md`, and documented the recommended end-to-end test setup.
> Validation: Ran `npm run build`, ran `npm test`, started the local Vite server, and smoke-tested the rendered UI in a browser. Live GitHub commit flows were not executed because there is no repository token in the environment.
> Learning: A dedicated `todo-test` repository or at least a dedicated test branch is not required for local validation, but it is strongly recommended for safe end-to-end verification of create, edit, move, delete, and conflict flows.

## [DONE 2026-04-18.1] Give instructions how to publish it to Google Play store

> Agent: Added Google Play publishing instructions to `README.md`, including Capacitor packaging steps, Android Studio signing, Play Console submission flow, and the current release-readiness checks.
> Changes: Documented the concrete commands to wrap the app for Android and called out the key blocker for a public store release: moving GitHub token handling out of browser storage.
> Validation: Reviewed the publishing path against the current project shape and documented the safest recommendation: use the app locally or for internal Android testing first, then harden auth before public release.
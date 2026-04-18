# Initial idea

I miss the TODO app that gives me the good access to my todos on my android. My todos are stored as files in [todo](..) dir which is also private github repo.

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

## Implement

## Think about verification
How can you test what you've just implemented? Do you have all that you need or I need to install something for you to the devcontainer that you are using?
Do you need github todo-test repo or it is not needed?
If you have everything you need do the tests or at least try to test/verify what you can.
Describe the concept for automatic tests and exploratory tests done by you for this project.

## Give instructions how to publish it to Google Play store
# Concurrency and sync guidance

## Recommended mobile-app behavior for this project

Concurrency is rare enough here that the app should stay simple in phase one.

Recommended approach:

- sync the latest branch head on app startup
- sync again when the app resumes from background
- sync immediately before each mutating action
- reject a write if the branch head changed and the ref update is no longer fast-forward

This is already close to the current implementation and fits the real workflow better than adding automatic merges.

## What to do on conflict

For this app, the best conflict behavior is:

1. show a clear message that the remote branch changed
2. keep the unsaved local editor content in memory
3. offer `Refresh and reload` rather than trying to auto-merge immediately
4. after refresh, let the user reapply or copy the local change if still needed

Why this is the right tradeoff:

- conflicts should be very rare
- automatic merge logic adds complexity and hidden risk
- most files are small notes, so manual reapplication is usually cheaper than maintaining merge machinery

## Suggested next improvement

If you want one quality-of-life improvement beyond the current MVP, add a lightweight recovery flow:

- when a publish fails with a stale-head conflict, keep the edited text visible
- offer one button: `Refresh from remote`
- after refresh, compare the remote content with the unsaved local buffer and let the user decide whether to overwrite, copy, or retry

That gives a safe recovery path without turning the app into a merge tool.

## VS Code side

The laptop conflict problem is better addressed in VS Code and git workflow than in the mobile app.

Practical guidance:

- enable automatic fetch in VS Code with `git.autofetch`
- fetch often, but do not enable unattended automatic pull into a dirty working tree
- pull manually before starting a work session and before pushing
- if you use the GitHub mobile app or this mobile TODO app during the day, make `pull --ff-only` the default habit on the laptop before editing

Why not automatic pull by default:

- VS Code can safely auto-fetch, but automatic pull can change the working tree under active edits
- that is exactly the kind of surprise that creates confusion or messy merge states

If you really want stronger automation on the laptop, the safer option is an external scheduled command that only runs when the repository is clean, for example a small script that checks `git status --porcelain` and then runs `git pull --ff-only`.
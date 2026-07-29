# TODO

## [FOR HUMAN]
* Review docs/

## [DONE 2026-07-29.1] Dodaj możliwość zaznaczania kilku plików naraz
i przeniesienia ich do razem do innego katalogu

> Agent: Added an explicit multi-selection mode to the file tree. Tap `Select`, choose any number of files using the visible checkboxes, tap `Move`, and choose one destination directory.
> Changes: The selection header shows the current count and supports cancel/back. The floating create action and per-file menus stay out of the way while selecting. All selected files are read by blob SHA and moved in one GitHub commit; the app rejects duplicate selected basenames and existing destination collisions before publishing, so it never silently overwrites a file. A successful move clears selection and refreshes the tree.
> Validation: `npm test` passed 9 tests and `npm run build` passed. The updated real browser E2E created two files (including an NFD Polish filename), selected both in the tree, moved both to `_short-term` with one UI action, reopened the Polish file, and deleted it successfully. `npm run android:build` passed on JDK 25 with Gradle 9.1 and produced the 4,348,020-byte debug APK at `android/app/build/outputs/apk/debug/app-debug.apk` (SHA-256 `5c6cbad684a0e4b493d6fc6834295751287c115640f112caf1a6cd6dd979022f`).

MG: Second select highlight previously selected row. I think this is not necessary.

> Agent: Agreed. The second highlight came from the normal “last opened file” state leaking into selection mode.
> Changes: Suppressed `tree-row-active` while `Select` mode is enabled; only rows explicitly checked by the user now receive selection highlighting.
> Validation: `npm test` passed 11 tests and `npm run build` passed. Extended the real browser E2E to open a file, return to the tree, enter selection mode, and assert that the previously opened row is not active before selecting it. The live UI test passed after restoring the updated environment's missing Playwright Chromium binary and Linux libraries; the unrelated Yarn APT source was temporarily disabled and automatically restored during that environment repair.

## [DONE 2026-07-29.1] Changes in the todo repo structure

I have removed `reviewed` subdirectories from my todo repo. Also `__today/tomorrow` has been moved to `__tomorrow`
Please check if we need so update in the app. For sure we should update documentation and and todo-app-test

> Agent: The app did require updates: move suggestions still targeted removed `reviewed/` directories, and the tree sorter did not recognize root-level `__tomorrow`.
> Changes: Replaced `__today/tomorrow` with `__tomorrow` in workflow suggestions and removed all `reviewed/` destinations/badges. Updated the representative repository layout and review workflow in README, the semantic sort regression, deterministic screenshot fixture, and regenerated all three README screenshots. Treated `todo_app_mobile_prototype_v2.html` as a historical design artifact rather than current documentation. In the separate `todo-app-test` repository, moved `mails.md` into new root `__tomorrow/` and flattened all `_short-term/reviewed/` and `review-every-weekend/reviewed/` files into their parents.
> Validation: Confirmed the current production `todo` tree has root `__tomorrow` and no tracked `reviewed/` or `__today/tomorrow/` paths. `npm test`, `npm run build`, and the deterministic screenshot test passed. Published the fixture migration to `todo-app-test/main` as commit `7cbf981`, then ran the live API create/edit/move/delete flow successfully from that updated main branch.

## [DONE 2026-07-29.1] Sorting and expanding

* Right now when I kill the app and open it again top level folders are expanded. By default I should see just top level folders with just `now` folder expanded.
  > Agent: The first repository load now expands only `__now`. Subsequent pulls preserve the user's current expanded/collapsed choices and discard only directories that no longer exist; saving settings for another repository resets the default initialization.
  > Validation: The live UI test asserts that a seeded `__today` file is absent before explicitly expanding `__today`, then completes the full workflow successfully.
* `__tomorrow` now lands as last folder while in VS Code I see it just after `__today`
  > Agent: Added `__tomorrow` to the semantic sort directly after `__today`, before `_short-term` and review directories.
  > Validation: Extended the unit regression with all relevant top-level directories and regenerated the collapsed-default README tree screenshot.

> Whole item validation: `npm test`, `npm run build`, the deterministic screenshot test, and the real browser E2E all passed.


## [DONE 2026-07-29.1] Maybe move pull now from settings screen somewhare to main screen?
What do you think about that?

> Agent: Yes. Pull is a tree/repository action used during normal work, so hiding it in configuration added unnecessary navigation. Reused the existing status chip instead of adding another crowded app-bar icon.
> Changes: The `synced` chip is now an accessible `Pull latest repository state` button. It becomes disabled during work and distinguishes `syncing…` from `publishing…`. Removed the action from settings while retaining its last-sync timestamp and file count.
> Validation: `npm test` and `npm run build` passed. The real browser E2E clicked the main-screen chip, observed `syncing…`, waited for `synced`, and then completed the repository workflow successfully.

## [NEW] Better UX when doing commit/publishing

Previously we did that:
* when status publishing is blinking other opeartions that change the status should be disabled in some way. Maybe gray?
  > Agent: Disabled conflicting tree, menu, create, settings, move, delete, and publish actions while an operation is in progress. Disabled actions are visibly dimmed and grayscale with a wait cursor.

Since publishing takes few seconds what about closing create popup imediatelly and showing new file in the app imediatelly. Only blinking publishing will indicate that changes are not yet ready. After publishing is done we still refresh the view based on data from repo.
When publishing is active other actions that changes repo are blocked.
Same for other operation.
What do you think about this idea? Do you have other better idea to make UX better?

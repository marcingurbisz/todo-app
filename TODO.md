# TODO

## [FOR HUMAN]
* Review docs/

## [NEW] Is App.tsx too big?

App.tsx is 1k lines long. Do you prefer to keep like that or worth to apply some split into few files? What kind of split would improve maintenance? Or maybe it's good as it is?

## [NEW] Align `Representative repository shape` in readme.md, content of screenshots and todo-app-test content
Prefer that all 3 contains current content of `Representative repository shape` but if you need to add something that exists in other sources also ok.

## [NEW] Add option to rename file

## [NEW] Preview mode show content in the middle of the screen instead aligned to the top

## Add screenshot with settings screen
Maybe all screenshot mogę next to representative repo shape?
Use black theme in screenshots.

## [DONE 2026-07-29.1] Changes in the todo repo structure

I have removed `reviewed` subdirectories from my todo repo. Also `__today/tomorrow` has been moved to `__tomorrow`
Please check if we need so update in the app. For sure we should update documentation and and todo-app-test

> Agent: The app did require updates: move suggestions still targeted removed `reviewed/` directories, and the tree sorter did not recognize root-level `__tomorrow`.
> Changes: Replaced `__today/tomorrow` with `__tomorrow` in workflow suggestions and removed all `reviewed/` destinations/badges. Updated the representative repository layout and review workflow in README, the semantic sort regression, deterministic screenshot fixture, and regenerated all three README screenshots. Treated `todo_app_mobile_prototype_v2.html` as a historical design artifact rather than current documentation. In the separate `todo-app-test` repository, moved `mails.md` into new root `__tomorrow/` and flattened all `_short-term/reviewed/` and `review-every-weekend/reviewed/` files into their parents.

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

## [DONE 2026-07-29.1] Better UX when doing commit/publishing

Previously we did that:
* when status publishing is blinking other opeartions that change the status should be disabled in some way. Maybe gray?
  > Agent: Disabled conflicting tree, menu, create, settings, move, delete, and publish actions while an operation is in progress. Disabled actions are visibly dimmed and grayscale with a wait cursor.

Since publishing takes few seconds what about closing create popup imediatelly and showing new file in the app imediatelly. Only blinking publishing will indicate that changes are not yet ready. After publishing is done we still refresh the view based on data from repo.
When publishing is active other actions that changes repo are blocked.
Same for other operation.
What do you think about this idea? Do you have other better idea to make UX better?

> Agent: This is a good mobile UX. Implemented it with one additional safeguard: optimistic changes are rolled back if publishing fails, and the relevant dialog or selection state is restored so the operation can be retried. If the commit succeeds but only the final refresh fails, the optimistic result remains visible because it already represents repository state, and the app asks for a pull.
> Changes: Create, single move, multi-move, move-up, and delete now close their dialogs/sheets immediately and optimistically rebuild the visible tree. Newly created and moved files appear at once, deleted files disappear at once, and destination directories expand automatically. The blinking `publishing…` chip is the pending indicator; all conflicting repository actions remain disabled until completion. A successful publish still reloads the authoritative repository snapshot.

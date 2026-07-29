# TODO

## [FOR HUMAN]
* Review docs/

## [REOPEN] Dodaj możliwość zaznaczania kilku plików naraz
i przeniesienia ich do razem do innego katalogu

> Agent: Added an explicit multi-selection mode to the file tree. Tap `Select`, choose any number of files using the visible checkboxes, tap `Move`, and choose one destination directory.
> Changes: The selection header shows the current count and supports cancel/back. The floating create action and per-file menus stay out of the way while selecting. All selected files are read by blob SHA and moved in one GitHub commit; the app rejects duplicate selected basenames and existing destination collisions before publishing, so it never silently overwrites a file. A successful move clears selection and refreshes the tree.
> Validation: `npm test` passed 9 tests and `npm run build` passed. The updated real browser E2E created two files (including an NFD Polish filename), selected both in the tree, moved both to `_short-term` with one UI action, reopened the Polish file, and deleted it successfully. `npm run android:build` passed on JDK 25 with Gradle 9.1 and produced the 4,348,020-byte debug APK at `android/app/build/outputs/apk/debug/app-debug.apk` (SHA-256 `5c6cbad684a0e4b493d6fc6834295751287c115640f112caf1a6cd6dd979022f`).

MG: Second select highlight previously selected row. I think this is not necessary.

## [NEW] Changes in the todo repo structure

I have removed `reviewed` subdirectories from my todo repo. Also `__today/tomorrow` has been moved to `__tomorrow`
Please check if we need so update in the app. For sure we should update documentation and and todo-app-test

## [NEW] Sorting and expanding

* Right now when I kill the app and open it again top level folders are expanded. By default I should see just top level folders with just `now` folder expanded.
* `__tomorrow` now lands as last folder while in VS Code I see it just after `__today`


## [NEW] Maybe move pull now from settings screen somewhare to main screen?
What do you think about that?

## [NEW] Better UX when doing commit/publishing

Previously we did that:
* when status publishing is blinking other opeartions that change the status should be disabled in some way. Maybe gray?
  > Agent: Disabled conflicting tree, menu, create, settings, move, delete, and publish actions while an operation is in progress. Disabled actions are visibly dimmed and grayscale with a wait cursor.

Since publishing takes few seconds what about closing create popup imediatelly and showing new file in the app imediatelly. Only blinking publishing will indicate that changes are not yet ready. After publishing is done we still refresh the view based on data from repo.
When publishing is active other actions that changes repo are blocked.
Same for other operation.
What do you think about this idea? Do you have other better idea to make UX better?

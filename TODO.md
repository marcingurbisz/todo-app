# Idea

I miss the TODO app that gives me the good access to my todos on my android. My todos are stored as files in [todo](../todo/) dir which is also private github repo. Since my primary app for interacting with my todos is VS Code I have very specific repo structure and workflows.

Representative structure from [../todo](../todo/):

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

## Workflows

* Moving files from one dir to another is done very often so it should be easy - 2-3 clicks max or drag and drop.
  * I every day move all files from __today/tomorrow to __today and during the day one by one from __today to tomorrow or to _short-term. 
  * In similar way I everyday move __short-term/reviewed to __short-term and then one by one from _short-term to _short-term/reviewed

## Requirements

* The primary view should be the files tree.
  * Rationale: this matches the real repo structure and the important workflow which is moving files between directories.
* I can edit and delete files
* After click on specific file would be nice to have editable preview of markdown. Switch to raw text should be also possible.
* Each change is published to the repo

# TODO

## [FOR HUMAN] For human
* Execute GPT-5.4-Cyber before publishing to Google Play store

## [DONE 2026-04-19.1] README.md remarks
* Address inline comments
* Incorporate this file "Idea" into readme?

> Agent: Addressed the inline comments in `README.md` and incorporated the substance of the `Idea` section into the README as product context, workflow expectations, and setup assumptions.
> Changes: Added a private single-user product context, representative repository structure, workflow summary, setup-provided repository configuration, and a more pragmatic test strategy centered on `todo-app-test` branches.
> Validation: Re-read the README after the edit to ensure each inline `MG` comment was answered in place and the updated text stayed aligned with the TODO ledger.

## Discuss architectural/tech stack choices
What are pros and cons of:
* React native
* Kotlin

Is Kotlin a one option or the are some sub-option? Any other choices worth considering?

## Remarks to UI
Setup screen (providing PAT) should be displayed as first screen only once and then access only via settings.
After setup the main screen after starting up should be files tree view.
At the end of this task please provide the screenshot for the views/screens.

## Testing with https://github.com/marcingurbisz/todo-app-test
* You have a PAT with content rw access for todo-app-test in local secrets.md file. Use it for testing and do not share with anybody nor put into committed files :).
* Prepare structure for testing based on exemplary structure from "Idea" under new directory ../todo-app-test and connect it to https://github.com/marcingurbisz/todo-app-test.
* I also wonder what should be the proper setup so you can test with todo-app-test but you do not know this token? Some CLI that starts a server being a proxy to Github and providing PAT? Any other idea?

## What are the alternatives for PAT authentication for this app?

## Perform exploratory test using todo-app-test

## Move README.md "Recommended release path" and "Release-readiness checks before store submission" to separate file

## Concurrency update discussions
I also modify todo repo and push from my laptop but concurrency is not big. Right now the minor problem is that after changes from github mobile app I sometimes forgot to synch on laptop and then I have merge conflicts. But this is more to be solved on VS Code side.

On mobile app side concurrency should not be a big deal as long as we pull/work on latest version before editing. What do you suggest to do if we have conflict on save/commit/push? Should be extremely rare to the point that I wonder if we need to care at all.

Is there a way in VS code to have pull done automatically periodically/on changes in remote repo?

# Notes

## UI prompt
Please create UI prototype considering "Idea".
What tech stack do you suggest for implementation? Kotlin? React native? Other?

## Claude Design

## Next prompt
* Instead of only preview can we have have it editable?
* Leave raw view too
# Tech Stack Options

## Decision context

The current codebase already has a working React + TypeScript web client. The product target is Android-first, but the app is for one private user and the key requirement is reliable repository interaction with a tree-heavy UI rather than advanced native-device features.

That changes the tradeoff significantly: delivery speed and reuse of the current implementation matter more than maximizing native UI purity.

## Options compared

## React Native

Pros:

- real mobile application model with native rendering
- good Android support and large ecosystem
- easier long-term access to secure storage and native device capabilities than a pure browser app
- can support polished touch interactions, including drag-and-drop, if the UI grows more advanced

Cons:

- does not reuse the current Vite web app directly; a meaningful rewrite would be needed
- markdown editing and tree-style file interactions are less straightforward than in a web UI
- build, debugging, and release pipeline is heavier than keeping the current web stack
- for this app, many screens are document and tree oriented rather than animation- or native-widget-heavy

Fit for this project:

- reasonable if the goal becomes a long-lived Android product with deeper native integration
- not the fastest path from the current repository state to a useful app

## Kotlin

`Kotlin` is not one option. The relevant sub-options are:

### Kotlin + Jetpack Compose

Pros:

- best native Android integration
- best fit for secure storage, background sync, notifications, and Android lifecycle handling
- strong performance and strong control over touch interactions
- best long-term option if Android is the only serious target

Cons:

- complete rewrite from the current web implementation
- higher initial implementation cost for markdown editing, GitHub API flows, and tree UI
- no direct reuse of the existing React code or browser validation work

Fit for this project:

- strongest technical option if the app eventually becomes Android-only and security hardening is the main priority
- too expensive as the immediate next step unless the current web prototype is being discarded

### Kotlin Multiplatform

Pros:

- shared business logic across platforms
- can keep domain logic in Kotlin while targeting Android first

Cons:

- adds architectural complexity without clear payoff for a single-user private app
- still does not help much with reusing the existing React UI
- more moving parts than this project currently needs

Fit for this project:

- not justified right now

## Capacitor with the current React app

Pros:

- highest reuse of the current implementation
- fastest path to an installable Android application
- web UI is a good match for tree browsing, markdown display, and text editing
- native plugins can be added selectively for secure storage later
- lower product risk because behavior can be verified in the browser first

Cons:

- still web-rendered UI rather than fully native UI
- advanced gestures may take more work than in a native stack
- secure storage and some mobile lifecycle concerns need explicit native integration later

Fit for this project:

- best near-term choice given the current codebase and requirements

## Other realistic choices

### PWA only

Pros:

- simplest delivery model
- no app-store packaging required initially

Cons:

- weaker device integration and secure storage story
- weaker fit for a polished Android installable experience

Fit for this project:

- useful for early personal validation, but not the best final Android direction

### Flutter

Pros:

- strong cross-platform mobile toolkit
- good control over UI and gestures

Cons:

- complete rewrite
- little benefit over React + Capacitor for this particular problem

Fit for this project:

- technically viable, but not justified by the current repo state

## Recommendation

Recommended path now:

1. Keep the current React + TypeScript codebase.
2. Improve the UX around setup, file tree workflows, and markdown editing.
3. Package the app with Capacitor for Android.
4. Move token handling to native secure storage before any serious distribution.

Reconsider Kotlin + Jetpack Compose later only if one of these becomes true:

- the app becomes Android-only for the long term
- secure native integration outweighs code reuse
- the UI needs native-grade gesture handling or offline behavior that becomes awkward in a web shell

Short version:

- best immediate path: React + Capacitor
- best Android-only long-term rewrite option: Kotlin + Jetpack Compose
- React Native is viable, but strategically awkward here because it requires a rewrite without a strong payoff over the current stack
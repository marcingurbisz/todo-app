# Authentication Options

## Current MVP approach

Current MVP:

- user enters a fine-grained GitHub personal access token
- app calls GitHub APIs directly
- token is stored locally in app-controlled storage

Why it is acceptable for the MVP:

- simplest path to validate the product
- works well for one private user and one private repository
- avoids needing a backend before the core UX is proven

Why it is not a strong long-term release model:

- the app handles a raw GitHub credential directly
- Play Store distribution raises the security bar significantly
- token revocation, rotation, and storage hardening become product requirements

## Alternatives

## GitHub App plus backend

How it works:

- the mobile app authenticates to your own backend
- the backend holds the GitHub App private key
- the backend exchanges requests for installation tokens and calls GitHub

Pros:

- strongest production-grade direction in this problem space
- no raw PAT stored in the client
- installation tokens are short-lived
- better auditability and revocation story

Cons:

- requires backend infrastructure
- more development effort than the MVP needs today
- more moving parts for a one-user private tool

Fit here:

- best long-term public-release option
- probably overkill until the app proves its value

## Backend proxy with stored PAT

How it works:

- the app talks to a small private service you control
- that service injects the PAT when forwarding requests to GitHub

Pros:

- much simpler than a full GitHub App setup
- keeps the PAT out of the mobile client
- very good fit for a one-user private tool

Cons:

- still relies on a PAT behind the scenes
- introduces a backend to maintain
- backend now becomes part of the trust boundary

Fit here:

- best pragmatic step if you want safer testing and private distribution soon
- especially useful for agent-driven testing, because the agent can call the proxy without learning the PAT

## Local companion service

How it works:

- a local desktop or home-server process stores the credential
- the mobile app talks only to that trusted service, typically over a private network or VPN

Pros:

- the PAT stays outside the app
- extremely good fit for a single-user personal workflow
- simplest way to let tools or agents test safely without seeing the token

Cons:

- app may stop working when the companion service is unavailable
- not a strong general-public app distribution model
- adds network and device-availability assumptions

Fit here:

- very strong option for private use
- particularly attractive if the goal is your own workflow rather than a public product

## OAuth app plus backend

How it works:

- user signs in with GitHub OAuth
- backend stores or exchanges tokens and mediates API access

Pros:

- familiar sign-in flow
- avoids asking the user to paste a PAT into the app

Cons:

- still typically needs backend support for safe token handling
- not as precise a fit as a GitHub App for repository-scoped server actions

Fit here:

- viable, but less compelling than a GitHub App or small backend proxy

## Git over SSH from the app

Pros:

- familiar to developers

Cons:

- awkward key management on mobile
- much weaker fit for a simple direct-edit app
- more complexity than the current GitHub API model

Fit here:

- not recommended

## Recommendation

For this project there are two sensible tracks:

### Track A: private personal tool

- keep the direct PAT approach for now or move to a local companion/proxy
- optimize for your own secure setup rather than general-user onboarding

### Track B: public Play Store app

- move away from raw PAT entry in the client
- adopt a backend-mediated model, ideally with a GitHub App

## Best next step

Best next step for the current project stage:

- for immediate testing and private use, a small local proxy or backend that injects the PAT is the best balance of safety and complexity
- for a real public release, GitHub App plus backend is the strongest target architecture
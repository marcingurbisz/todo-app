# Google Play release guidance

The current codebase is ready for local browser use and internal Android packaging work, but not yet for a public Play Store release as-is. The main release blocker is authentication storage: the MVP keeps the GitHub token in browser storage, while a store build should use native secure storage and ideally a safer auth model than a personal access token embedded in a client app.

## Recommended release path

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

## Release-readiness checks before store submission

- move token storage from `localStorage` to native secure storage
- define what happens when a token expires or is revoked
- consider replacing personal access tokens with a GitHub App or backend-mediated auth flow
- add device-level exploratory testing on real Android hardware
- verify accessibility for touch targets, keyboard, and text scaling
- test offline, slow network, and API failure cases

## Practical recommendation

For the current MVP, the safest route is:

- use the web app locally now
- package to Android for personal use or internal testing
- delay public Play release until the auth and secure-storage story is upgraded
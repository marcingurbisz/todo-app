# Android developer install

The repository is already prepared for Android packaging with Capacitor.

What is already in the repo:

- Capacitor dependencies in `package.json`
- `capacitor.config.ts`
- generated Android project in `android/`

## Current environment status

The Android wrapper was generated successfully in the devcontainer.

Local APK build in the devcontainer is currently blocked by environment setup, not by app code:

- Java 25 was too new for the generated Gradle/Groovy toolchain
- Java 21 works for Gradle startup
- the remaining blocker is missing Android SDK in the devcontainer

That means the right next place to produce and install the debug app is a machine with Android Studio and Android SDK configured.

## Recommended local setup on your machine

1. Install Android Studio.
2. In Android Studio, install the standard Android SDK, platform tools, and a recent Android platform.
3. Use JDK 21 for the Android build if Android Studio does not manage it automatically.

## Build and install on a physical Android phone

1. Enable Developer options on the phone.
2. Enable USB debugging.
3. Connect the phone over USB and accept the debugging authorization prompt.
4. In the repo root, run:

```bash
npm install
npm run android:sync
```

5. Open the generated Android project:

```bash
npm run android:open
```

6. In Android Studio:

- wait for Gradle sync to finish
- choose the connected phone as the target device
- press `Run`

Android Studio will build and install a debug app directly on the phone.

## Command-line alternative

If `adb` and Android SDK are configured on your machine, you can also use Gradle directly:

```bash
cd android
./gradlew assembleDebug
./gradlew installDebug
```

Expected debug APK path:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Updating the app after changes

Whenever the web UI changes:

```bash
npm run android:sync
```

Then rebuild or rerun from Android Studio.

## First-run usage on the phone

After install:

1. Open the app.
2. Enter repository owner, repository name, branch, and GitHub token.
3. Save setup.
4. The app will load into the file tree view.

## Notes

- This is a developer/debug install path, not a Play Store release path.
- The app currently stores the token locally on-device, so use a fine-grained token limited to the intended repository.
- For a public release, see `docs/google-play-release.md`.
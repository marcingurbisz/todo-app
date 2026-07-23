# Android developer install

The repository is already prepared for Android packaging with Capacitor.

What is already in the repo:

- Capacitor dependencies in `package.json`
- `capacitor.config.ts`
- generated Android project in `android/`

## Toolchain

The Android host is written in Kotlin. Its compiler target is JVM 21.

The repository can bootstrap the headless toolchain on Linux x64:

- if Android SDK is missing, the build downloads the pinned Google command-line
  tools archive, verifies Google's published checksum, and keeps the SDK under
  the ignored `.android-sdk/` directory
- through Android CLI it accepts the Android SDK terms and installs pinned
  Platform Tools 37.0.0, Android SDK Platform 36, and Build Tools 36.0.0

The checked-in Gradle 9.1 wrapper runs on JDK 17 through 25, including the
preferred JDK 21 and JDK 25. The application bytecode remains targeted at JVM
21. Set `ANDROID_SDK_ROOT` if you prefer to use an existing Android SDK.

On macOS, Windows, or Linux ARM, install Android Studio (including its SDK) and
set `ANDROID_SDK_ROOT`; use an installed JDK from the supported range.

## Build and install on a physical Android phone

1. Enable Developer options on the phone.
2. Enable USB debugging.
3. Connect the phone over USB and accept the debugging authorization prompt.
4. In the repo root, install the web dependencies and build the debug APK:

```bash
npm install
npm run android:build
```

The APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

5. Install it over USB:

```bash
npm run android:install
```

The install command rebuilds the current app, invokes `adb install -r`, and
preserves app data when replacing an earlier debug build.

## Linux USB permissions

If `npm run android:install` ends with `adb: insufficient permissions for device`,
the APK build already succeeded and only the USB install step failed.

1. Check that the phone is visible:

```bash
lsusb
```

2. Create a udev rule for the phone vendor under
`/etc/udev/rules.d/51-android.rules`, for example:

```text
SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", MODE="0666", GROUP="plugdev", TAG+="uaccess"
```

Replace `18d1` with the vendor ID reported by `lsusb` for your device.

3. Reload udev and reconnect the phone:

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

4. Accept the USB debugging prompt on the phone and confirm the device is ready:

```bash
adb devices
```

5. Retry:

```bash
npm run android:install
```

If you do not want to use `adb`, you can also copy
`android/app/build/outputs/apk/debug/app-debug.apk` to the phone and open it
there to install manually.

## Android Studio alternative

After `npm run android:sync`, open the generated Android project:

```bash
npm run android:open
```

Wait for Gradle sync, choose the connected phone, and press `Run`.

## Command-line alternative

If a supported JDK and Android SDK are already configured, you can use Gradle directly:

```bash
cd android
./gradlew assembleDebug
./gradlew installDebug
```

## Updating the app after changes

Whenever the web UI changes:

```bash
npm run android:install
```

This syncs the current web build, rebuilds the APK, and installs it.

## First-run usage on the phone

After install:

1. Open the app.
2. Enter repository owner, repository name, branch, and GitHub token.
3. Save setup.
4. The app will load into the file tree view.

## Notes

- This is a developer/debug install path, not a Play Store release path.
- The automatic toolchain bootstrap currently supports Linux x64. It downloads
  about 500 MB on the first build and reuses those files afterward.
- The app currently stores the token locally on-device, so use a fine-grained token limited to the intended repository.
- For a public release, see `docs/google-play-release.md`.

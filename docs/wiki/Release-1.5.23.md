# Release 1.5.23 (Expo SDK 58)

Built and launched locally before release: Android with Android Studio's Gradle (AAB and APK, API 37 emulator) and iOS with Xcode 27.2 (Release build in the iOS Simulator).

## What changed

| Area | Before | Now |
|---|---|---|
| Expo SDK | 57 | 58 |
| React Native | 0.86.3 | 0.88.1 |
| React | 19.3.1 | 19.3.0 (matches the 0.88.1 renderer) |
| Lottie | 7.3.8 | 7.5.0 |
| Android toolchain | Gradle 8.13, AGP 8.12, Kotlin 2.1.20 (forced by `withKotlinKspFix`) | Gradle 9.4.1, AGP 9.2.1, Kotlin 2.2.0 (Expo 58 template) |
| Firebase (RNFB) | 24.1.1 | 24.1.1. Version 27 needs Swift Package Manager on iOS and code changes; that's a separate job. |

## Problems found by testing, and fixed

| Problem | Where | Fix |
|---|---|---|
| iOS crashed on launch: "No Firebase App '[DEFAULT]' has been created" | SDK 58 AppDelegate is multi-line; the start-up call moved to SceneDelegate | `withIosFirebaseSwiftFix` matches the new signature (#717) |
| iOS build: "Failed to parse firebase.json" | RNFB's build script pastes the file into a Ruby string; the CSP header's quotes break it | Patch passes the JSON through an environment variable (#717) |
| iOS build: `expo-app-metrics` failed to compile | Podfile plugin forced Swift 5 on a Swift 6 pod | Pods that declare Swift 6 keep it (#717) |
| iOS build: pods below iOS 15 rejected by Xcode 27 | Old pod deployment targets | Lifted to 16.4 (#715) |
| Android: "Minimum supported Gradle version is 9.4.1" | `withKotlinKspFix` pinned old Gradle and AGP | Pins removed (#715) |
| Android: R8 ran out of memory | 512 MB metaspace | 4 GB heap, 1.5 GB metaspace (#715) |
| Android APK: "Avoid setting extractNativeLibs" | `withFirebaseDeferredInit` set it | No longer set (#718) |
| Meme Generator save would throw | `expo-media-library` 58 moved the API | Imports `expo-media-library/legacy` (#716) |
| Qlty "Build errored" | `$name` overrides unreadable in Qlty's filtered package.json | Written as literal versions (#718) |

## Play Console notes

- **Edge-to-edge:** React Native 0.88 itself no longer calls the deprecated colour APIs (0 references in the new bundle). The patched `react-android` release is not needed anymore.
- **Bitmap optimisation:** the flagged calls are in libraries, not app code: expo-image (animated APNG/WebP), Lottie (the app's animations have no embedded images), the image-picker cropper (cropping is off), Firebase App Check and Analytics. The upgrade doesn't remove them, so the advice stays.

## WhatsApp login code

`phone-session` can send a 6-digit code through MSG91's WhatsApp template and check it against a signed challenge (5-minute expiry, 5 tries, single use). The app tries WhatsApp first and falls back to Firebase SMS. It stays off (the server replies 503) until `MSG91_AUTHKEY`, `MSG91_WA_NUMBER`, `MSG91_WA_TEMPLATE` and `OTP_SIGNING_SECRET` are set on the function.

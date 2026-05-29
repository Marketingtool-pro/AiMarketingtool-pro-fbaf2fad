# ♊ Gemini & AI Assistant Guide: MarketingTool Pro

Welcome to the AI integration guide for **MarketingTool Pro** (`AiMarketingtool-pro-fbaf2fad`). This document provides critical architectural context, build rules, deployment steps, and automation details to help any AI agent pair-program or debug this workspace efficiently.

---

## 🛠️ Project Stack & Architecture

This is a premium hybrid React Native application utilizing:
- **Core Framework**: Expo SDK 56 + React Native 0.85
- **Design System**: Tamagui (Sleek dark mode interfaces)
- **Data & Auth**: Appwrite (Core Auth, User Profiles, Database)
- **AI & Serverless**: Firebase (Genkit-powered AI Functions, App Check, Hosting)
- **Native Graphics**: `@shopify/react-native-skia` (Premium GPU-accelerated drawing)

---

## 🤖 AI Development Guidelines

When modifying this repository, follow these precise guidelines:

### 1. Android SDK & Compile Requirements (API 36 / Android 16)
- **Important**: This project uses Expo SDK 56 which relies on `WindowCompat.enableEdgeToEdge()` inside `expo-dev-launcher`. This API requires compiling against **Android 16 (API 36)**.
- Always ensure `compileSdkVersion` and `targetSdkVersion` are set to `36` in both `android/build.gradle` and `app.json` (under `expo-build-properties` plugin configurations).
- **Core Dependency Pin**: Do **NOT** pin `androidx.core` to older versions (e.g., `1.15.0`) in Gradle's `resolutionStrategy` because it will cause compilation errors with unresolved edge-to-edge references.

### 2. Native Graphics & Skia Binaries
- The `@shopify/react-native-skia` native module requires prebuilt binaries to compile on Android.
- If native compilation fails due to missing `libskia.a`, always run:
  ```bash
  npx install-skia
  ```
  This downloads and places the required `.a` libraries under `node_modules/@shopify/react-native-skia/libs/android/`.

---

## 📦 Package Management & Release to GitHub Packages

The project is configured to publish Node.js packages directly to **GitHub Packages** (`npm.pkg.github.com`).

- **Release Workflow**: The npm package publishing is automated via GitHub Actions in:
  - [.github/workflows/publish-package.yml](file:///.github/workflows/publish-package.yml)
  - [.github/workflows/npm-publish-github-packages.yml](file:///.github/workflows/npm-publish-github-packages.yml)
- **Trigger**: Creating and publishing a new **GitHub Release** (e.g., `v1.5.0`) automatically pushes the git tag and triggers the publishing workflows using the repository secrets.
- **Manual Webhook Creation/Verification**:
  - Verification: `gh api repos/Marketingtool-pro/AiMarketingtool-pro-fbaf2fad/hooks`
  - Create Hook:
    ```bash
    gh api --method POST repos/Marketingtool-pro/AiMarketingtool-pro-fbaf2fad/hooks \
      -f name="web" \
      -F active=true \
      -f "events[]=* " \
      -f "config[url]=YOUR_WEBHOOK_URL" \
      -f "config[content_type]=json"
    ```

---

## 🚀 Deployment & Continuous Integration (CI/CD)

The CI/CD pipeline handles both **Google Play Store Auto-Submission** and **Firebase Web Hosting** deployment.

### 1. Android EAS Build & Submit
- The GitHub Actions runner executes [.github/workflows/production-deploy.yml](file:///.github/workflows/production-deploy.yml) on push to the `Master` branch or on tag creation `v*.*.*`.
- It executes `eas build --platform android --profile production` and then automatically submits the compiled AAB to the Play Store via `eas submit --platform android`.

### 2. Firebase Web Hosting
- Web builds are compiled using Expo Web Export:
  ```bash
  npm run build  # Triggers: expo export --platform web
  ```
- The generated output in `dist/` is automatically deployed to Firebase Hosting (`marketing-tool-484720`) via the [.github/workflows/firebase-hosting-merge.yml](file:///.github/workflows/firebase-hosting-merge.yml) workflow using the configured `firebase.json`.

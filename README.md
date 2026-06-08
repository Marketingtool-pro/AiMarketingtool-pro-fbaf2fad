# Marketingtool-pro Phone App (Main)

## 🚀 Overview
Hybrid React Native application using **Appwrite** for core Auth/Data and **Firebase** for AI Functions, Observability, and Hosting.

## 🏗️ Architecture
- **Backend (Auth/DB):** Appwrite (v1.8.1) hosted on VPS 1.
- **Backend (AI/Functions):** Firebase Genkit AI.
- **Web Hosting:** Firebase Hosting with GitHub Actions.
- **Monitoring:** Firebase Crashlytics. _(Firebase Performance Monitoring was removed — `RNFBPerf` with `useFrameworks: static` crashed iOS on cold start.)_
- **Security:** Firebase App Check (Play Integrity / App Attest).

## 🛠️ Maintenance Scripts
- `setup_master.sh`: Full environment sync (mise, brew, account tokens).
- `cleanup_workspace.sh`: Deep clean junk and caches.
- `developer_project_scanner.rb`: Project and Firebase config audit.

## 📦 Deployment
Push a version tag (`vX.Y.Z`) → the **Production Deploy** workflow runs:
- **Android:** EAS build → submit to Play Store.
- **Apple:** EAS build → upload → App Store review submission **carrying the build + all in-app purchases** via `scripts/asc_autosubmit.rb`. (Plain `eas submit` is binary-only and cannot carry IAPs — that caused the repeated Guideline 2.1(b) rejections.)
- **Web:** Firebase Hosting on merge to `Master`.

> In-app purchases (6 subscriptions + 1 consumable) **must be submitted together with the build** for first review. Build numbers auto-increment (`appVersionSource: remote`).

---
*Maintained by Marketingtool-pro*

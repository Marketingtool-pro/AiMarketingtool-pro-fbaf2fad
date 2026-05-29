# Marketingtool-pro Phone App (Main)

## 🚀 Overview
Hybrid React Native application using **Appwrite** for core Auth/Data and **Firebase** for AI Functions, Observability, and Hosting.

## 🏗️ Architecture
- **Backend (Auth/DB):** Appwrite (v1.8.1) hosted on VPS 1.
- **Backend (AI/Functions):** Firebase Genkit AI.
- **Web Hosting:** Firebase Hosting with GitHub Actions.
- **Monitoring:** Firebase Crashlytics & Performance Monitoring.
- **Security:** Firebase App Check (Play Integrity / App Attest).

## 🛠️ Maintenance Scripts
- `setup_master.sh`: Full environment sync (mise, brew, account tokens).
- `cleanup_workspace.sh`: Deep clean junk and caches.
- `developer_project_scanner.rb`: Project and Firebase config audit.

## 📦 Deployment

- **Android:** Automated via EAS (production profile).
- - **Apple:** Automated via EAS (production profile).
- **Web:** Automated via GitHub Actions on merge to master.

---
*Maintained by Marketingtool-pro*

# Marketingtool-pro Phone App

Open-source Expo / React Native app for AI-powered marketing workflows on mobile.

## Overview

Marketingtool-pro Phone App is the mobile client for the Marketingtool-pro platform. It combines **Appwrite** for core authentication and account data with **Firebase** for AI flows, observability, and hosting-related services.

## Highlights

- Expo / React Native mobile application
- Hybrid backend architecture using Appwrite and Firebase
- Phone-number sign-in flow bridged into an Appwrite session
- AI-powered tool execution for marketing workflows
- Firebase App Check, Crashlytics, messaging, and analytics support
- GitHub Actions-based deployment automation

## Architecture at a glance

### Mobile app
- Entry points: `App.tsx` and `src/navigation/AppNavigator.tsx`
- Startup is staged so the splash screen remains visible while fonts, auth bootstrap, and Firebase App Check initialize
- Messaging, analytics, and crash reporting are deferred until after first layout to reduce cold-start regressions

### Auth and data
- **Appwrite** is the primary backend for account and database operations
- **Firebase Auth** is used for phone OTP verification
- After Firebase verification, the app calls the Appwrite `phone-session` function to create the session used by the rest of the app

### AI execution
- The app loads its tool catalog from `src/data/tools.js`
- `src/services/aiService.ts` prefers the Appwrite `tool-executor` function
- The client can fall back to web APIs hosted at `app.marketingtool.pro`
- The `functions/` package contains Firebase Functions v2 + Genkit flows used by backend AI features

### Backend packages
- `functions/` — Firebase Functions v2 + Genkit + Firestore
- `appwrite-functions/phone-session` — Appwrite function for converting a verified Firebase Phone Auth UID into an Appwrite session

## Repository structure

- `src/` — app screens, navigation, services, state, and UI code
- `functions/` — Firebase Functions and Genkit flows
- `appwrite-functions/` — Appwrite backend functions
- `assets/` — static app assets
- `scripts/` — repository maintenance and deployment helpers
- `docs/` — supporting documentation

## Getting started

### Prerequisites
- Node.js and npm
- Expo-compatible iOS, Android, or web environment
- Required Appwrite and Firebase configuration values

### Install dependencies
```bash
npm ci
```

### Run the app
```bash
npm start
```

Platform-specific commands:

```bash
npm run ios
npm run android
npm run web
```

### Validate the project
```bash
npm run doctor
npx tsc --noEmit
```

## Firebase Functions package

Install and build the functions package separately:

```bash
cd functions && npm ci
cd functions && npm run build
cd functions && npm run lint
```

Local serving commands:

```bash
cd functions && npm run serve
cd functions && npm run shell
```

## Deployment

Production deployment is automated through GitHub Actions.

- Tagging a release as `vX.Y.Z` triggers the production deployment workflow
- Android builds are produced with EAS and submitted to Google Play
- Apple builds are produced with EAS and processed for App Store submission
- Web hosting deploys on merge to `Master`

> Do not trigger EAS build or submission flows without explicit approval.

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a branch for your change
3. Make and test your updates
4. Open a pull request with a clear description

Please also review:
- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)

## Security

If you discover a security issue, please do **not** open a public issue. Follow the private reporting guidance in [SECURITY.md](SECURITY.md).

## License

This repository is currently marked `UNLICENSED` in `package.json`. If the project is intended to be open source for reuse, add an explicit open-source license file and update the package metadata accordingly.

---

Maintained by Marketingtool-pro

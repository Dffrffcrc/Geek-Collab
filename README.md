# GeekCollab — React Native

This repository contains a React Native port of the original SwiftUI forum app. It runs on iOS, Android and the web (via Expo web export).

**Quick links**

- **Start (dev)**: `npm start` — opens Expo DevTools
- **Web build & deploy**: `npm run build:web` then `npx firebase-tools deploy --only hosting`

## Project structure

```
App.js
package.json
Models.js
AuthViewModel.js
DiscussionViewModel.js
ContentView.js
AuthView.js
ForumHomeView.js
DiscussionDetailView.js
NewDiscussionView.js
FAQView.js
MediaPicker.js
StorageExtension.js
```

## Setup

1. Install project dependencies

```bash
npm install
```

2. (iOS only) Install CocoaPods

```bash
cd ios && pod install && cd ..
```

3. Run in development

```bash
# Expo DevTools / Expo Go
npm start

# Run on device/emulator
npm run ios
npm run android
```

## Web build & hosting

- Build the web export (outputs `dist/`):

```bash
npm run build:web
```

- Deploy to Firebase Hosting (replace with your project config):

```bash
npx firebase-tools deploy --only hosting
```

Notes for web hosting:
- The web UI depends on vector icon font files being served (Ionicons). If hosted fonts return HTML (index.html) the icons will not render — ensure your hosting uploads the `dist/assets/node_modules/*` font files and does not rewrite requests for those assets to `index.html`.
- In our Firebase config we add content headers for font files (CORS + long cache) and set `index.html` to `no-cache` so updates propagate reliably.

## Firebase configuration (optional)

If you want to enable Firestore persistence for forum state, add the following environment variables to a `.env` file at project root:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

After adding `.env`, restart the dev server.

Behavior when Firebase is configured:
- The app reads/writes forum state to the Firestore document `appState/forumState`.
- AsyncStorage is used as a local cache and fallback so the app still runs without Firebase configured.

## Important notes

- Passwords are currently stored in plain text in AsyncStorage (keeps behaviour from the original demo). Add hashing (`expo-crypto`) before using this in production.
- Images are stored as base64 strings rather than binary blobs.
- Moderation features (reports, mute, ban) and role-based permissions (`admin`, `moderator`, `user`) are implemented in the view-models; review server-side rules before production use.

## Scripts

- `npm start` — start Expo dev server
- `npm run ios` / `npm run android` — open on native platforms via Expo
- `npm run build:web` — create web export in `dist/`
- `npm run deploy` — convenience script: build web + firebase deploy (requires `firebase-tools` and project configured)

---
If you'd like, I can also add a short section showing how we solved a common web issue (icons appearing as numbers due to fonts returning HTML) and a recommended `firebase.json` snippet. Want that added?

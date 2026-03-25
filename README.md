# TechCollab — React Native

Converted from SwiftUI (iOS-only) to React Native (iOS + Android).

## Project Structure

```
TechCollab/
├── App.js                          # Entry point (ForumAppApp.swift)
├── package.json
├── Models.js                       # Data types (users/discussions/forums)
├── AuthViewModel.js                # Auth logic + role-aware signup/login
├── DiscussionViewModel.js          # Forum lifecycle, moderation, notifications
├── ContentView.js                  # Root view
├── AuthView.js                     # Login / Sign up screen
├── ForumHomeView.js                # Home feed + forum controls + moderation UI
├── DiscussionDetailView.js         # Full discussion + comments
├── NewDiscussionView.js            # Create post sheet
├── FAQView.js                      # FAQ section
├── MediaPicker.js                  # Image picker wrapper
└── StorageExtension.js             # AsyncStorage helpers
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. iOS — install pods
```bash
cd ios && pod install && cd ..
```

### 3. Run
```bash
# Expo Go (easiest)
npx expo start

# Native builds
npx expo run:ios
npx expo run:android
```

## Key Conversion Notes

| Swift / iOS | React Native |
|---|---|
| `@Observable` / `@State` | `useState`, `useCallback` hooks |
| `UserDefaults` | `@react-native-async-storage/async-storage` |
| `UUID()` | `react-native-uuid` |
| `UIImagePickerController` | `react-native-image-picker` |
| `NavigationView` / `.sheet` | `Modal` (slide) |
| `List` | `FlatList` |
| `ScrollView(.horizontal)` | `ScrollView horizontal` |
| `Image(data:)` | `Image` with base64 data URI |
| `DispatchQueue.main.asyncAfter` | `setTimeout` |
| `SafeAreaView` modifier | `SafeAreaView` component |

## Notes

- **Passwords** are stored in plain text in AsyncStorage (mirrors original Swift). Add hashing (e.g. `expo-crypto`) for production.
- **Images** are stored as base64 strings instead of `Data` blobs.
- Includes role-based permissions (`admin`, `moderator`, `user`) and dictionary-based word filtering.
- Forums can be short-term and auto-switch to read-only after expiry.
- In-app notifications, report/delete tools, temporary mute, and admin ban controls are implemented in the feed/detail views.

## Firebase (Posts/Forums Storage)

This project now supports Firestore for storing forum/post state while keeping auth unchanged.

### 1) Add Firebase Web SDK config to your environment

Create a `.env` file in project root and add:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 2) Restart Expo

```bash
npm run start
```

### 3) Firestore collection used

- `appState/forumState` document stores the forum/post state.

### Behavior

- If Firebase config is present, forum/post state is read from and written to Firestore.
- AsyncStorage is still used as local cache/fallback so the app continues to run even without Firebase configured.

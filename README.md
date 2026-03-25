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

# TechCollab — React Native

Converted from SwiftUI (iOS-only) to React Native (iOS + Android).

## Project Structure

```
TechCollab/
├── App.js                          # Entry point (ForumAppApp.swift)
├── package.json
└── src/
    ├── models/
    │   └── Models.js               # Data types (Models.swift)
    ├── viewmodels/
    │   ├── AuthViewModel.js        # Auth logic (AuthViewModel.swift)
    │   └── DiscussionViewModel.js  # Discussion logic (DiscussionViewModel.swift)
    ├── views/
    │   ├── ContentView.js          # Root view (ContentView.swift)
    │   ├── AuthView.js             # Login / Sign up screen (AuthView.swift)
    │   ├── ForumHomeView.js        # Home feed + DiscussionCard (ForumHomeView.swift)
    │   ├── DiscussionDetailView.js # Full discussion + comments (DiscussionDetailView.swift)
    │   ├── NewDiscussionView.js    # Create post sheet (NewDiscussionView.swift)
    │   └── MediaPicker.js         # Image picker wrapper (MediaPicker.swift)
    └── utils/
        └── StorageExtension.js    # AsyncStorage helpers (UserDefaults+Extension.swift)
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
- The mock discussions in `DiscussionViewModel.js` exactly mirror the original Swift mock data.
- The logout button is integrated into `ForumHomeView`'s header (top-right), replacing the ZStack overlay approach in `ContentView.swift`.

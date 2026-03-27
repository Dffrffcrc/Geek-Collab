# GeekCollab

GeekCollab is a community forum app built with Expo/React Native (web + mobile) for creating time-bound discussion forums with moderation controls.

## What this project does

- User auth with roles (`admin`, `moderator`, `user`)
- Forum creation with open/read-only lifecycle
- Post and comment discussions with tags and optional images
- Like/report workflows
- Moderation tools: mute, ban, delete user posts, close/reopen forums
- Deleted-post archive with restore/purge actions
- Firebase-backed persistence with local AsyncStorage fallback

## Environment

Create a `.env` file at the project root with your Firebase values:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

## Quick Start

Run these commands in order:

```bash
npm install
firebase login
npm start
npm run deploy
```

# forum.geekshacking

## Background

GeeksHacking workshop participants may struggle to continue learning and stay connected with their peers after a workshop ends. **forum.geekshacking** addresses this problem by providing a dedicated community platform where participants can ask questions, exchange ideas, share resources, and continue discussions beyond the workshop.

The app was developed for GeeksHacking using React Native Web and Expo. Firebase provides authentication, database storage, file storage, and web hosting. The app also integrates with the GeeksHacking portal so participants can sign in using their existing accounts.

The website supports Progressive Web App functionality, allowing users to install it on supported devices and access it with an app-like experience.

## Technology used

- TypeScript
- React Native Web
- Expo and Expo Router
- Firebase Authentication, Firestore, and Storage
- Firebase Hosting and Cloud Functions

## Building the project

### Prerequisites

Before starting, install:

- Node.js 20 and npm
- the Firebase CLI and
- a Firebase project with Authentication, Firestore, Storage, Hosting, and Cloud Functions enabled.

### 1. Clone the repository

```bash
git clone https://github.com/GeeksHacking/Geek-Collab.git
cd Geek-Collab
```

### 2. Install the dependencies

Install the app dependencies:

```bash
npm install
```

Install the Cloud Functions dependencies:

```bash
cd functions
npm install
cd ..
```

### 3. Configure Firebase

Create a `.env` file in the root directory and add the following values from your Firebase project:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_PORTAL_PROVIDER_ID=oidc.geekshackingportal
```

The portal provider must also be configured as an OpenID Connect provider in Firebase Authentication. Replace the provider ID if your Firebase project uses a different one.

### 4. Run the development version

```bash
npm run web
```

Expo will display the local development address in the terminal.

### 5. Create a production build

```bash
npm run build:web
```

The exported website will be created in the `dist` directory.

## Firebase setup

Log in to Firebase and select the appropriate project:

```bash
firebase login
firebase use your_project_id
```

Deploy the Firestore rules, indexes, Storage rules, and Cloud Functions:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

### Bootstrap the first administrator

The first administrator must be granted access using the bootstrap script. After that, the first administrator can promote or revoke other administrators from the app's **Admin → Users** page.

1. In the Firebase Console, open **Project settings → Service accounts** and generate a private key.
2. Create a `secrets` directory in the repository root.
3. Save the key as `secrets/service-account.json`.


Run the following command from the repository root:

```bash
cd functions
GOOGLE_APPLICATION_CREDENTIALS=../secrets/service-account.json npm run bootstrap-admin -- @username
cd ..
```

Replace `@username` with the username of the account to promote. Keep the `@` prefix so the script looks up the account in the `usernames` collection:

```bash
GOOGLE_APPLICATION_CREDENTIALS=../secrets/service-account.json npm run bootstrap-admin -- @USERNAME
```

Alternatively, pass the user's Firebase Authentication UID without an `@`:

```bash
GOOGLE_APPLICATION_CREDENTIALS=../secrets/service-account.json npm run bootstrap-admin -- abc123XYZ
```

The user must have completed profile setup before running the script. When successful, the terminal will show:

```text
Granted admin to @username (uid=abc123XYZ).
They must sign out and back in for the new claim to take effect.
```

The script sets the user's `{ admin: true }` Firebase Authentication custom claim, creates the matching `admins/{uid}` Firestore document, and revokes existing refresh tokens. The promoted user must sign out and sign back in before using administrator features.

### Troubleshooting administrator setup

- **`GOOGLE_APPLICATION_CREDENTIALS env var must point to a service-account JSON key.`**  
  Include the complete environment variable before `npm run`.
- **`No user found with username @foo.`**  
  Check the spelling and confirm that the user has completed profile setup.
- **`No users/xyz profile doc.`**  
  The UID is incorrect or that user has not completed profile setup.
- **`ENOENT ../secrets/service-account.json`**  
  Confirm that the key exists at `secrets/service-account.json` in the repository root.

## Deploy the website

Build and deploy the production website to Firebase Hosting:

```bash
npm run deploy
```

## Available commands

| Command | Description |
| --- | --- |
| `npm start` | Starts the Expo development server |
| `npm run web` | Runs the web app locally |
| `npm run build:web` | Creates a production web build |
| `npm run deploy` | Builds and deploys the website to Firebase Hosting |
| `npm --prefix functions run build` | Compiles the Cloud Functions |
| `npm --prefix functions run deploy` | Deploys only the Cloud Functions |

## Administrator configuration

Administrator usernames are not hardcoded. Administrator authority is represented by:

- an `{ admin: true }` custom claim on the user's Firebase Authentication token; and
- a corresponding `admins/{uid}` document in Firestore.

The `setAdmin` callable Cloud Function updates both records when an existing administrator promotes or revokes another administrator. It also prevents the last remaining administrator from being demoted.

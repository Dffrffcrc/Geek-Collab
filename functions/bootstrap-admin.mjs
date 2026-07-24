#!/usr/bin/env node
// One-shot script to grant the first admin — needed because the in-app
// "Make admin" button requires the caller to already have the admin custom
// claim. Bootstrap by running this once against your Firebase project with
// a service-account key.
//
// Usage (run from inside the functions/ directory):
//     GOOGLE_APPLICATION_CREDENTIALS=../secrets/service-account.json \
//       node bootstrap-admin.mjs <uid-or-@username>
//
// Grant an existing admin the ability to promote others via the UI. After
// this runs once, sign in as that user and use /admin/users to grant
// additional admins.
//
// Get a service-account key from:
//   Firebase Console → Project Settings → Service accounts → Generate new
//   private key. Save into ./secrets/ (git-ignored) and never commit.
//
// The script:
//   1. Resolves the argument to a Firebase Auth uid (accepts a raw uid or
//      a `@username` that gets looked up via usernames/{name}).
//   2. Sets the { admin: true } custom claim on that user.
//   3. Creates admins/{uid} Firestore doc so client + rules see the change
//      immediately.
//   4. Revokes the user's refresh tokens so their next sign-in picks up the
//      new claim on the first token issued.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node bootstrap-admin.mjs <uid-or-@username>');
  process.exit(1);
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    'GOOGLE_APPLICATION_CREDENTIALS env var must point to a service-account JSON key.',
  );
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const auth = getAuth();
const db = getFirestore();

let targetUid;
let targetUsername = '';
let targetUsernameLower = '';

if (arg.startsWith('@')) {
  const nameLower = arg.slice(1).toLowerCase();
  const unameSnap = await db.collection('usernames').doc(nameLower).get();
  if (!unameSnap.exists) {
    console.error(`No user found with username ${arg}.`);
    process.exit(1);
  }
  targetUid = unameSnap.get('uid');
  targetUsernameLower = nameLower;
} else {
  targetUid = arg;
}

const userSnap = await db.collection('users').doc(targetUid).get();
if (!userSnap.exists) {
  console.error(`No users/${targetUid} profile doc. User must complete signup first.`);
  process.exit(1);
}
targetUsername = userSnap.get('username') ?? '';
targetUsernameLower = userSnap.get('usernameLower') ?? targetUsernameLower;

await auth.setCustomUserClaims(targetUid, { admin: true });
await db.collection('admins').doc(targetUid).set({
  uid: targetUid,
  username: targetUsername,
  usernameLower: targetUsernameLower,
  promotedBy: 'bootstrap-script',
  promotedByUsername: 'bootstrap-script',
  promotedAt: FieldValue.serverTimestamp(),
});
await auth.revokeRefreshTokens(targetUid);

console.log(`Granted admin to @${targetUsername} (uid=${targetUid}).`);
console.log('They must sign out and back in for the new claim to take effect.');

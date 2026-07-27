#!/usr/bin/env node


























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

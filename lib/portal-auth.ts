import { Platform } from 'react-native';
import {
  OAuthProvider,
  getRedirectResult,
  signInWithRedirect,
  signOut,
  type UserCredential,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';

const providerId = process.env.EXPO_PUBLIC_FIREBASE_PORTAL_PROVIDER_ID?.trim();

export function isPortalAuthConfigured() {
  return Boolean(providerId);
}

function getPortalProvider() {
  if (!providerId) {
    throw new Error('Portal sign-in is not configured.');
  }
  const provider = new OAuthProvider(providerId);
  provider.setCustomParameters({ prompt: 'select_account' });
  provider.addScope('openid');
  provider.addScope('profile');
  provider.addScope('email');
  return provider;
}

function normalizeUsernameCandidate(value: string) {
  const cleaned = value
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-zA-Z0-9_.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\-_]+|[.\-_]+$/g, '');
  return cleaned.slice(0, 20) || 'user';
}

function getProfileBase(user: UserCredential['user']) {
  const emailLocalPart = user.email?.split('@')[0] ?? '';
  const providerProfile = user.providerData[0];
  const preferredUsername =
    typeof providerProfile?.uid === 'string' ? providerProfile.uid : '';
  const displayName =
    user.displayName?.trim() ||
    providerProfile?.displayName?.trim() ||
    emailLocalPart ||
    'GeeksHacking User';
  const usernameBase = normalizeUsernameCandidate(preferredUsername || emailLocalPart || displayName);
  return { displayName: displayName.slice(0, 35), usernameBase };
}

async function ensurePortalUserProfile(cred: UserCredential) {
  const userRef = doc(db, 'users', cred.user.uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) return;

  const { displayName, usernameBase } = getProfileBase(cred.user);

  await runTransaction(db, async (tx) => {
    const current = await tx.get(userRef);
    if (current.exists()) return;

    let chosen = usernameBase.toLowerCase();
    let attempt = 0;

    while (attempt < 25) {
      const suffix = attempt === 0 ? '' : String(attempt + 1);
      const truncatedBase = usernameBase.slice(0, Math.max(1, 20 - suffix.length));
      chosen = `${truncatedBase}${suffix}`.toLowerCase();
      const usernameRef = doc(db, 'usernames', chosen);
      const usernameSnap = await tx.get(usernameRef);
      if (!usernameSnap.exists()) {
        tx.set(userRef, {
          email: cred.user.email ?? '',
          username: chosen,
          usernameLower: chosen,
          displayName,
          phoneNumber: null,
          photoURL: null,
          authProvider: 'portal',
          createdAt: serverTimestamp(),
        });
        tx.set(usernameRef, { uid: cred.user.uid });
        return;
      }
      attempt += 1;
    }

    throw new Error('Could not allocate a username for this account.');
  });
}

export async function startPortalSignIn() {
  if (Platform.OS !== 'web') {
    throw new Error('Portal sign-in is only supported on web in this app.');
  }
  const provider = getPortalProvider();
  await signInWithRedirect(auth, provider);
  return null;
}

export async function completePortalRedirect() {
  if (Platform.OS !== 'web' || !isPortalAuthConfigured()) return null;
  const result = await getRedirectResult(auth);
  if (!result) return null;
  await ensurePortalUserProfile(result);
  return result;
}

export async function signOutPortalUser() {
  await signOut(auth);
}

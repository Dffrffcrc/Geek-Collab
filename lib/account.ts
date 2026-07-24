import {
  OAuthProvider,
  deleteUser,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth';
import {
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';

// Must match lib/portal-auth.ts. Kept independent to avoid a circular import.
const PORTAL_PROVIDER_ID =
  process.env.EXPO_PUBLIC_FIREBASE_PORTAL_PROVIDER_ID?.trim() || 'oidc.geekshackingportal';

// Posts/comments/likes/uploads are deliberately NOT cascaded — they stay
// attributed to the denormalised author fields under the same username.
async function purgeFirestoreProfile(uid: string, usernameLower: string) {
  if (usernameLower) {
    try {
      await deleteDoc(doc(db, 'usernames', usernameLower));
    } catch (err) {
      console.warn('[account:delete] username release failed for', usernameLower, err);
    }
  }

  try {
    const forumsSnap = await getDocs(
      query(collection(db, 'forums'), where('moderatorUids', 'array-contains', uid)),
    );
    await Promise.all(
      forumsSnap.docs.map((f) =>
        updateDoc(f.ref, { moderatorUids: arrayRemove(uid) }).catch((e) => {
          console.warn('[account:delete] mod removal failed for forum', f.id, e);
        }),
      ),
    );
  } catch (err) {
    console.warn('[account:delete] moderator scan failed:', err);
  }

  // 3. Delete the profile doc last.
  await deleteDoc(doc(db, 'users', uid));
}

// Self-serve deletion. Firebase Auth's deleteUser requires a recent sign-in;
// if it's been a while since login, Firebase throws `auth/requires-recent-login`
// and we transparently pop the portal for reauth then retry.
//
// Firebase Auth session persists to IndexedDB, so this is the one path that
// can actually purge the auth record — no server-side action needed.
export async function deleteMyAccount(usernameLower: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');

  // Firestore cleanup first — if the Firebase Auth delete succeeds but this
  // step fails, we're left with orphan Firestore data AND no way to sign
  // back in to clean it up.
  await purgeFirestoreProfile(user.uid, usernameLower);

  try {
    await deleteUser(user);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/requires-recent-login') {
      await reauthPortal(user);
      await deleteUser(user);
      return;
    }
    throw err;
  }
}

async function reauthPortal(user: User) {
  const provider = new OAuthProvider(PORTAL_PROVIDER_ID);
  provider.addScope('openid');
  provider.addScope('profile');
  provider.addScope('email');
  await reauthenticateWithPopup(user, provider);
}

// Admin-initiated deletion. Cannot delete the target's Firebase Auth account
// from the client — that requires the Admin SDK on a server. What we CAN do:
// wipe the Firestore profile + username + mod roles so the target is
// effectively expelled from the app. If the timeouts/{uid} ban doc is in
// place, the target can't create a new profile either (BannedScreen blocks
// them at /complete-profile).
export async function deleteAccountAsAdmin(
  targetUid: string,
  targetUsernameLower: string,
): Promise<void> {
  await purgeFirestoreProfile(targetUid, targetUsernameLower);
}

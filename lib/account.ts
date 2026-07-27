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


const PORTAL_PROVIDER_ID =
  process.env.EXPO_PUBLIC_FIREBASE_PORTAL_PROVIDER_ID?.trim() || 'oidc.geekshackingportal';



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


  await deleteDoc(doc(db, 'users', uid));
}







export async function deleteMyAccount(usernameLower: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');




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







export async function deleteAccountAsAdmin(
  targetUid: string,
  targetUsernameLower: string,
): Promise<void> {
  await purgeFirestoreProfile(targetUid, targetUsernameLower);
}

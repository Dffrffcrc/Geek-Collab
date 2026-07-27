import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();











export const setAdmin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Only admins can manage admins.');
  }

  const { targetUid, admin } = request.data as {
    targetUid?: unknown;
    admin?: unknown;
  };
  if (typeof targetUid !== 'string' || !targetUid) {
    throw new HttpsError('invalid-argument', 'targetUid is required.');
  }
  if (typeof admin !== 'boolean') {
    throw new HttpsError('invalid-argument', 'admin must be boolean.');
  }

  const auth = getAuth();
  const db = getFirestore();



  if (!admin) {
    const admins = await db.collection('admins').get();
    const currentAdminUids = new Set(admins.docs.map((d) => d.id));
    currentAdminUids.delete(targetUid);
    if (currentAdminUids.size === 0) {
      throw new HttpsError(
        'failed-precondition',
        'Cannot demote the last admin. Promote someone else first.',
      );
    }
  }



  let username = '';
  let usernameLower = '';
  try {
    const userSnap = await db.collection('users').doc(targetUid).get();
    if (userSnap.exists) {
      username = (userSnap.get('username') as string) ?? '';
      usernameLower = (userSnap.get('usernameLower') as string) ?? '';
    }
  } catch (err) {


    console.warn('[setAdmin] user profile lookup failed:', err);
  }




  await auth.setCustomUserClaims(targetUid, admin ? { admin: true } : {});

  const adminDoc = db.collection('admins').doc(targetUid);
  if (admin) {
    await adminDoc.set({
      uid: targetUid,
      username,
      usernameLower,
      promotedBy: request.auth.uid,
      promotedByUsername: request.auth.token.name ?? '',
      promotedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await adminDoc.delete().catch(() => {
      /* doc may not exist — non-fatal */
    });
  }





  await auth.revokeRefreshTokens(targetUid);

  return { ok: true, targetUid, admin };
});

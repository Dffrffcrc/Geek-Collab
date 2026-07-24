import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();

// Callable for existing admins to grant or revoke admin on any Firebase Auth
// user. Two mirrored writes:
//   - Firebase Auth custom claim { admin: true } on the target's ID token
//     (used by firestore.rules `isAdmin()` — request.auth.token.admin).
//   - admins/{uid} Firestore doc (used by rules `targetIsAdmin(uid)` and by
//     the client to render admin badges + gate mod actions on admin authors).
//
// The two must stay in sync or the UI will lie about who is admin. Both
// writes happen inside this function so callers can't get one without the
// other.
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

  // Refuse to demote the last remaining admin. Guards against admins locking
  // themselves out of their own site.
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

  // Pull user profile so the admins/{uid} doc carries a username for the
  // client to render badges without a second lookup.
  let username = '';
  let usernameLower = '';
  try {
    const userSnap = await db.collection('users').doc(targetUid).get();
    if (userSnap.exists) {
      username = (userSnap.get('username') as string) ?? '';
      usernameLower = (userSnap.get('usernameLower') as string) ?? '';
    }
  } catch (err) {
    // Best-effort: still write the claim + doc even if the profile lookup
    // fails. Username can be backfilled later from the users doc.
    console.warn('[setAdmin] user profile lookup failed:', err);
  }

  // Custom claims MERGE with existing claims — pass { admin } as the whole
  // object so `admin: false` actually removes the flag (per Firebase docs,
  // passing null wipes all claims which we do not want).
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

  // Force the target's next token refresh to pick up the new claim. Without
  // this, an existing session can keep using the old claim until the ~1-hour
  // refresh cycle. Existing admin sessions being demoted lose access on the
  // client's next call to getIdToken(true).
  await auth.revokeRefreshTokens(targetUid);

  return { ok: true, targetUid, admin };
});

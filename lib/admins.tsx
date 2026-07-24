import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { getIdTokenResult, onIdTokenChanged } from 'firebase/auth';
import { auth, db, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

// =============================================================================
// ADMIN AUTHORITY
// =============================================================================
// There is no hardcoded admin list anymore. Admins are defined by:
//   - a Firebase Auth custom claim { admin: true } on the user's ID token, and
//   - a mirrored /admins/{uid} Firestore doc.
// Both are written atomically by the `setAdmin` Cloud Function (functions/
// src/index.ts) or the one-time bootstrap script (functions/bootstrap-
// admin.mjs) for the very first admin.
//
// The client subscribes to the /admins collection so it can render admin
// badges next to any user + gate mod actions on admin-authored content
// without needing a Cloud Function round-trip.
// =============================================================================

type Admin = {
  uid: string;
  username: string;
  usernameLower: string;
};

type AdminsState = {
  loaded: boolean;
  adminUids: Set<string>;
  adminUsernames: Set<string>;
  admins: Admin[];
};

const EMPTY: AdminsState = {
  loaded: false,
  adminUids: new Set(),
  adminUsernames: new Set(),
  admins: [],
};

const AdminsContext = createContext<AdminsState>(EMPTY);

export function AdminsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminsState>(EMPTY);

  useEffect(() => {
    return onSnapshot(
      collection(db, 'admins'),
      (snap) => {
        const admins: Admin[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            username: (data.username as string) ?? '',
            usernameLower: (data.usernameLower as string) ?? '',
          };
        });
        setState({
          loaded: true,
          adminUids: new Set(admins.map((a) => a.uid)),
          adminUsernames: new Set(admins.map((a) => a.username).filter(Boolean)),
          admins,
        });
      },
      (err) => {
        console.warn('[admins] snapshot failed:', err);
        setState((s) => ({ ...s, loaded: true }));
      },
    );
  }, []);

  return <AdminsContext.Provider value={state}>{children}</AdminsContext.Provider>;
}

// Hook returns the live admin snapshot plus two lookup helpers. Components
// that need to check other users' admin status (badges, "can I moderate
// this admin's post" gates) should destructure `isAdminUsername` / `isAdminUid`
// from here — they close over the current snapshot and trigger a re-render
// when it changes.
export function useAdmins() {
  const state = useContext(AdminsContext);
  return {
    ...state,
    isAdminUsername: (username: string | null | undefined): boolean =>
      !!username && state.adminUsernames.has(username),
    isAdminUid: (uid: string | null | undefined): boolean =>
      !!uid && state.adminUids.has(uid),
  };
}

// True when the currently signed-in user has the { admin: true } custom
// claim on their Firebase Auth ID token. Reactively updates as the token
// rotates (Firebase rotates hourly, or on demand via getIdToken(true)).
export function useIsServerAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    return onIdTokenChanged(auth, async (u) => {
      if (!u) {
        setIsAdmin(false);
        return;
      }
      try {
        const result = await getIdTokenResult(u);
        setIsAdmin(result.claims.admin === true);
      } catch (err) {
        console.warn('[admins] getIdTokenResult failed:', err);
        setIsAdmin(false);
      }
    });
  }, []);

  return isAdmin;
}

// Calls functions/src/index.ts#setAdmin. Only admins can invoke it (the
// Cloud Function checks the caller's custom claim). Throws on rejection —
// callers should surface the message from HttpsError.
export async function callSetAdmin(targetUid: string, admin: boolean): Promise<void> {
  const call = httpsCallable<{ targetUid: string; admin: boolean }, { ok: boolean }>(
    functions,
    'setAdmin',
  );
  await call({ targetUid, admin });
}

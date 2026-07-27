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




export async function callSetAdmin(targetUid: string, admin: boolean): Promise<void> {
  const call = httpsCallable<{ targetUid: string; admin: boolean }, { ok: boolean }>(
    functions,
    'setAdmin',
  );
  await call({ targetUid, admin });
}

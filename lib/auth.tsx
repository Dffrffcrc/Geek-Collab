import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { completePortalRedirect } from './portal-auth';

type AuthState = {
  user: User | null;
  initializing: boolean;
  authError: string | null;


  needsProfile: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  initializing: true,
  authError: null,
  needsProfile: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);

  const refreshProfile = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      setNeedsProfile(false);
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'users', current.uid));
      setNeedsProfile(!snap.exists());
    } catch (err) {
      console.warn('[auth] refreshProfile failed:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    completePortalRedirect()
      .catch((error: unknown) => {
        console.error('[auth] portal redirect failed:', error);
        if (!cancelled) {
          setAuthError(
            error instanceof Error ? error.message : 'Portal sign-in could not be completed.',
          );
        }
      })
      .finally(() => {
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(auth, async (u) => {
          if (cancelled) return;
          if (!u) {
            setUser(null);
            setNeedsProfile(false);
            setInitializing(false);
            return;
          }
          setUser(u);



          try {
            await u.getIdToken(true);
          } catch (err) {
            console.warn('[auth] token refresh failed:', err);
          }
          try {
            const snap = await getDoc(doc(db, 'users', u.uid));
            if (cancelled) return;
            setNeedsProfile(!snap.exists());
          } catch (err) {
            console.warn('[auth] profile check failed:', err);
            if (cancelled) return;


            setNeedsProfile(false);
          }
          setInitializing(false);
        });
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, authError, needsProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

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
  // True when Firebase Auth has a user but Firestore has no matching
  // users/{uid} doc yet — the user needs to visit /complete-profile before
  // they can enter the app. Set on every auth state change based on a
  // getDoc against users/{uid}.
  needsProfile: boolean;
  // Re-check the profile without waiting for the next auth state change.
  // Called by /complete-profile after it creates the doc so the app-wide
  // routing (which reads needsProfile) updates immediately.
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
            const snap = await getDoc(doc(db, 'users', u.uid));
            if (cancelled) return;
            setNeedsProfile(!snap.exists());
          } catch (err) {
            console.warn('[auth] profile check failed:', err);
            if (cancelled) return;
            // Fail closed: if we can't tell, don't send the user to
            // /complete-profile — better to let them into the app than to
            // trap them on a signup screen because of a transient network
            // hiccup.
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

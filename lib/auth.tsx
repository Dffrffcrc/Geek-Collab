import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';
import { completePortalRedirect } from './portal-auth';

type AuthState = {
  user: User | null;
  initializing: boolean;
  authError: string | null;
};

const AuthContext = createContext<AuthState>({ user: null, initializing: true, authError: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

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
        unsubscribe = onAuthStateChanged(auth, (u) => {
          setUser(u);
          setInitializing(false);
        });
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return <AuthContext.Provider value={{ user, initializing, authError }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

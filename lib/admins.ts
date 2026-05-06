import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';

// Hardcoded email list — used for client-only convenience gates (e.g. showing
// the "+ New forum" button). For destructive actions like forum deletion,
// always use `useIsServerAdmin` instead, since rules check the
// `admins/{uid}` document — see firestore.rules.
export const ADMIN_EMAILS = [
  'thesomethingcompany.inc@gmail.com',
];

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// True iff the current user has an `admins/{uid}` doc. Kept in Firestore so
// that security rules can enforce it. Set up by manually creating the doc in
// the Firebase Console (no fields needed, just the doc).
export function useIsServerAdmin(): boolean {
  const { user } = useAuth();
  const [isServerAdmin, setIsServerAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsServerAdmin(false);
      return;
    }
    return onSnapshot(doc(db, 'admins', user.uid), (snap) => {
      setIsServerAdmin(snap.exists());
    });
  }, [user]);

  return isServerAdmin;
}

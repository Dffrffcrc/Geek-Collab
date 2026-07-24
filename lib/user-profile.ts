import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, updateDoc, type Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';

export type RecentForum = { slug: string; name: string; viewedAt: number; readOnly?: boolean };

export type UserProfile = {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  bio?: string;
  photoURL?: string | null;
  recentForums?: RecentForum[];
  createdAt?: Timestamp;
};

export const MAX_BIO_LENGTH = 240;

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const ref = doc(db, 'users', user.uid);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setProfile({ uid: user.uid, ...(snap.data() as Omit<UserProfile, 'uid'>) });
      else setProfile(null);
    });
  }, [user]);

  return profile;
}

export async function trackForumVisit(
  uid: string,
  slug: string,
  name: string,
  readOnly: boolean,
) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const existing: RecentForum[] = (snap.data()?.recentForums as RecentForum[] | undefined) ?? [];
  const filtered = existing.filter((f) => f.slug !== slug);
  const updated: RecentForum[] = [{ slug, name, viewedAt: Date.now(), readOnly }, ...filtered].slice(0, 5);
  await updateDoc(ref, { recentForums: updated });
}

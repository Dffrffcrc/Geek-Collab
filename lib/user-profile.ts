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
  phoneNumber: string | null;
  photoURL: string | null;
  recentForums?: RecentForum[];
  createdAt?: Timestamp;
};

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    // Live subscription so the sidebar's "Recently Visited" stays fresh.
    const ref = doc(db, 'users', user.uid);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setProfile({ uid: user.uid, ...(snap.data() as Omit<UserProfile, 'uid'>) });
      else setProfile(null);
    });
  }, [user]);

  return profile;
}

// Track a forum visit on the user's profile. Keeps the most-recent 5,
// dedup-ed by slug, with `readOnly` reflecting the forum's state at view time.
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

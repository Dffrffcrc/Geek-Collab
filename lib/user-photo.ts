import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

type Entry = {
  photoURL: string | null;
  subscribers: Set<(v: string | null) => void>;
  unsub?: () => void;
};

const cache = new Map<string, Entry>();

export function useUserPhoto(uid: string | undefined | null): string | null {
  const [photoURL, setPhotoURL] = useState<string | null>(() => {
    if (!uid) return null;
    return cache.get(uid)?.photoURL ?? null;
  });

  useEffect(() => {
    if (!uid) {
      setPhotoURL(null);
      return;
    }
    let entry = cache.get(uid);
    if (!entry) {
      entry = { photoURL: null, subscribers: new Set() };
      cache.set(uid, entry);
      entry.unsub = onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          const val = snap.exists() ? ((snap.data().photoURL as string | null | undefined) ?? null) : null;
          const e = cache.get(uid);
          if (!e) return;
          e.photoURL = val;
          e.subscribers.forEach((cb) => cb(val));
        },
        () => {},
      );
    }
    entry.subscribers.add(setPhotoURL);
    setPhotoURL(entry.photoURL);
    return () => {
      const e = cache.get(uid);
      if (!e) return;
      e.subscribers.delete(setPhotoURL);
      if (e.subscribers.size === 0) {
        e.unsub?.();
        cache.delete(uid);
      }
    };
  }, [uid]);

  return photoURL;
}

import { useEffect, useState } from 'react';
import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// ----- Soft delete helpers ----------------------------------------------
export async function softDeletePost(
  forumSlug: string,
  postSlug: string,
  byUid: string,
  byUsername: string,
): Promise<void> {
  await updateDoc(doc(db, 'forums', forumSlug, 'posts', postSlug), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: byUid,
    deletedByUsername: byUsername,
  });
}

export async function restorePost(forumSlug: string, postSlug: string): Promise<void> {
  await updateDoc(doc(db, 'forums', forumSlug, 'posts', postSlug), {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    deletedByUsername: null,
  });
}

export async function softDeleteComment(
  forumSlug: string,
  postSlug: string,
  commentId: string,
  byUid: string,
  byUsername: string,
): Promise<void> {
  await updateDoc(doc(db, 'forums', forumSlug, 'posts', postSlug, 'comments', commentId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: byUid,
    deletedByUsername: byUsername,
  });
}

export async function restoreComment(
  forumSlug: string,
  postSlug: string,
  commentId: string,
): Promise<void> {
  await updateDoc(doc(db, 'forums', forumSlug, 'posts', postSlug, 'comments', commentId), {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    deletedByUsername: null,
  });
}

// ----- Bans (global, no expiry) -----------------------------------------
// We reuse the timeouts collection with a `type` field so existing rule
// checks (userTimedOut) catch both timeouts and bans.
export async function banUser(
  uid: string,
  byUid: string,
  byUsername: string,
  reason?: string,
): Promise<void> {
  await setDoc(doc(db, 'timeouts', uid), {
    type: 'ban',
    expiresAt: null,
    timedOutBy: byUid,
    timedOutByUsername: byUsername,
    reason: reason ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function liftBan(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'timeouts', uid));
}

// ----- Mod assignments (admin-only) -------------------------------------
export async function addModerator(forumSlug: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'forums', forumSlug), {
    moderatorUids: arrayUnion(uid),
  });
}

export async function removeModerator(forumSlug: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'forums', forumSlug), {
    moderatorUids: arrayRemove(uid),
  });
}

// ----- Forum lifecycle (admin) ------------------------------------------
// "Open forum" = extend closesAt past now to revive a closed forum.
export async function reopenForum(forumSlug: string, newClosesAt: Date): Promise<void> {
  await updateDoc(doc(db, 'forums', forumSlug), {
    closesAt: Timestamp.fromMillis(newClosesAt.getTime()),
  });
}

// ----- Content filter ----------------------------------------------------
export type ContentFilter = { words: string[]; updatedAt?: Timestamp; updatedBy?: string };

export function useContentFilter(): ContentFilter {
  const [filter, setFilter] = useState<ContentFilter>({ words: [] });
  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'contentFilter'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setFilter({
          words: Array.isArray(data.words) ? data.words : [],
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        });
      } else {
        setFilter({ words: [] });
      }
    });
  }, []);
  return filter;
}

export async function setContentFilterWords(words: string[], byUid: string): Promise<void> {
  // Lowercased + de-duped + trimmed for consistent matching.
  const normalized = Array.from(
    new Set(words.map((w) => w.trim().toLowerCase()).filter((w) => w.length > 0)),
  );
  await setDoc(doc(db, 'config', 'contentFilter'), {
    words: normalized,
    updatedAt: serverTimestamp(),
    updatedBy: byUid,
  });
}

// Returns the offending word if the text contains one, else null.
export function violatesContentFilter(text: string, words: string[]): string | null {
  if (!text || words.length === 0) return null;
  const lower = text.toLowerCase();
  for (const w of words) {
    if (!w) continue;
    if (lower.includes(w)) return w;
  }
  return null;
}

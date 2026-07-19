import { useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';

// ----- Report reasons (used by the report modal + filter dropdowns) ------
export const REPORT_REASONS = [
  'Spam',
  'Harassment / Bullying',
  'Hate speech',
  'Sexual content',
  'Violence / Threats',
  'Misinformation',
  'Off-topic',
  'Other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportTargetType = 'post' | 'comment';
export type ReportStatus = 'open' | 'resolved' | 'quarantined';

export type Report = {
  id: string;
  targetType: ReportTargetType;
  targetId: string; // post slug for posts; comment id for comments
  parentPostSlug?: string; // populated when target is a comment
  // Denormalized author info so mods can mute/timeout from the report row
  // without an extra read. Optional for backward-compat with reports created
  // before this field existed.
  targetAuthorUid?: string;
  targetAuthorUsername?: string;
  reason: ReportReason;
  details: string;
  reporterUid: string;
  reporterUsername: string;
  status: ReportStatus;
  createdAt: Timestamp;
};

// ----- Activity log -------------------------------------------------------
export type ActivityType =
  | 'post_created'
  | 'post_edited'
  | 'post_deleted'
  | 'post_pinned'
  | 'post_unpinned'
  | 'post_quarantined'
  | 'post_unquarantined'
  | 'comment_created'
  | 'comment_edited'
  | 'comment_deleted'
  | 'user_muted'
  | 'user_unmuted'
  | 'user_timed_out'
  | 'report_filed'
  | 'report_resolved';

export type Activity = {
  id: string;
  type: ActivityType;
  actorUid: string;
  actorUsername: string;
  targetType?: 'post' | 'comment' | 'user' | 'report';
  targetId?: string;
  details?: string;
  createdAt: Timestamp;
};

// Renders an activity event as a single human-readable phrase like
//   "deleted post \"My Title\""   /   "muted @bob"   /   "commented"
// for the moderator + admin activity views. Avoids ever surfacing raw UIDs
// or random Firestore doc IDs, which made the old log unreadable. Returns
// just the predicate — the caller renders the actor (e.g. "@alice") in
// front of it.
//
// Convention (set by the call sites in PostCard / [post].tsx / etc.):
//   user_*      → details = the target's username (no @)
//   post_*      → details = the post title when available; targetId = slug
//   comment_*   → targetId = comment id (always opaque, never shown)
//   report_*    → targetId = report id (always opaque, never shown)
export function describeActivity(a: Pick<Activity, 'type' | 'targetId' | 'details'>): string {
  const { type, targetId, details } = a;
  const postLabel = details ? `"${details}"` : targetId ? `"${targetId}"` : '';
  switch (type) {
    case 'post_created':
      return postLabel ? `posted ${postLabel}` : 'posted';
    case 'post_edited':
      return postLabel ? `edited ${postLabel}` : 'edited a post';
    case 'post_deleted':
      return postLabel ? `deleted post ${postLabel}` : 'deleted a post';
    case 'post_pinned':
      return postLabel ? `pinned ${postLabel}` : 'pinned a post';
    case 'post_unpinned':
      return postLabel ? `unpinned ${postLabel}` : 'unpinned a post';
    case 'post_quarantined':
      return postLabel ? `quarantined ${postLabel}` : 'quarantined a post';
    case 'post_unquarantined':
      return postLabel ? `un-quarantined ${postLabel}` : 'un-quarantined a post';
    case 'comment_created':
      return details === 'reply' ? 'replied to a comment' : 'commented';
    case 'comment_edited':
      return 'edited a comment';
    case 'comment_deleted':
      return 'deleted a comment';
    case 'user_muted':
      return details ? `muted @${details}` : 'muted a user';
    case 'user_unmuted':
      return details ? `unmuted @${details}` : 'unmuted a user';
    case 'user_timed_out':
      return details ? `timed out @${details}` : 'timed out a user';
    case 'report_filed':
      return 'filed a report';
    case 'report_resolved':
      return 'resolved a report';
    default:
      // Exhaustive switch — but if a new ActivityType ships before this
      // helper is updated, fall back to the snake-case name with spaces.
      return String(type).replace(/_/g, ' ');
  }
}

// Best-effort: log an activity event to forums/{slug}/activity.
// Failures are swallowed because activity logging shouldn't block UX.
export async function logActivity(
  forumSlug: string,
  actorUid: string,
  actorUsername: string,
  type: ActivityType,
  extra: Partial<Pick<Activity, 'targetType' | 'targetId' | 'details'>> = {},
): Promise<void> {
  try {
    await addDoc(collection(db, 'forums', forumSlug, 'activity'), {
      type,
      actorUid,
      actorUsername,
      targetType: extra.targetType ?? null,
      targetId: extra.targetId ?? null,
      details: extra.details ?? null,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[activity] log failed:', err);
  }
}

// ----- Participant tracking ---------------------------------------------
export async function trackParticipant(
  forumSlug: string,
  uid: string,
  username: string,
  displayName: string,
  kind: 'post' | 'comment',
): Promise<void> {
  try {
    const ref = doc(db, 'forums', forumSlug, 'participants', uid);
    const snap = await getDoc(ref);
    const now = serverTimestamp();
    if (snap.exists()) {
      const data = snap.data();
      await updateDoc(ref, {
        username,
        displayName,
        lastActiveAt: now,
        postCount: (data.postCount ?? 0) + (kind === 'post' ? 1 : 0),
        commentCount: (data.commentCount ?? 0) + (kind === 'comment' ? 1 : 0),
      });
    } else {
      await setDoc(ref, {
        username,
        displayName,
        firstSeenAt: now,
        lastActiveAt: now,
        postCount: kind === 'post' ? 1 : 0,
        commentCount: kind === 'comment' ? 1 : 0,
      });
    }
  } catch (err) {
    console.warn('[participants] track failed:', err);
  }
}

// ----- Mod actions: mute (per-forum) -----------------------------------
export async function muteUser(
  forumSlug: string,
  targetUid: string,
  modUid: string,
  reason?: string,
): Promise<void> {
  await setDoc(doc(db, 'forums', forumSlug, 'mutes', targetUid), {
    mutedAt: serverTimestamp(),
    mutedBy: modUid,
    reason: reason ?? null,
  });
}

export async function unmuteUser(forumSlug: string, targetUid: string): Promise<void> {
  await deleteDoc(doc(db, 'forums', forumSlug, 'mutes', targetUid));
}

// ----- Mod actions: global timeout -------------------------------------
export async function timeoutUser(
  targetUid: string,
  modUid: string,
  modUsername: string,
  reason: string,
  options: { expiresAt?: Date | null } = {},
): Promise<void> {
  await setDoc(doc(db, 'timeouts', targetUid), {
    type: 'timeout',
    timedOutBy: modUid,
    timedOutByUsername: modUsername,
    expiresAt: options.expiresAt ?? null,
    reason,
    createdAt: serverTimestamp(),
  });
}

export async function liftTimeout(targetUid: string): Promise<void> {
  await deleteDoc(doc(db, 'timeouts', targetUid));
}

// ----- Admin actions: delete forum (cascading best-effort) -----------
// Walks subcollections in this order: posts→comments, posts→likes, posts;
// then reports, mutes, participants, activity; finally the forum doc itself.
// Failures inside subcollections are logged and skipped — the forum doc
// delete at the end is what removes the forum from the listing.
export async function deleteForumCascading(forumSlug: string): Promise<void> {
  async function deleteAllInCollection(path: string[]): Promise<void> {
    try {
      const snap = await getDocs(collection(db, path[0], ...path.slice(1)));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref).catch(() => undefined)));
    } catch (err) {
      console.warn('[forum:delete] subcollection failed:', path.join('/'), err);
    }
  }

  // Walk posts first to clean their subcollections.
  try {
    const postsSnap = await getDocs(collection(db, 'forums', forumSlug, 'posts'));
    for (const p of postsSnap.docs) {
      await deleteAllInCollection(['forums', forumSlug, 'posts', p.id, 'comments']);
      await deleteAllInCollection(['forums', forumSlug, 'posts', p.id, 'likes']);
      await deleteDoc(p.ref).catch(() => undefined);
    }
  } catch (err) {
    console.warn('[forum:delete] posts walk failed:', err);
  }

  await deleteAllInCollection(['forums', forumSlug, 'reports']);
  await deleteAllInCollection(['forums', forumSlug, 'mutes']);
  await deleteAllInCollection(['forums', forumSlug, 'participants']);
  await deleteAllInCollection(['forums', forumSlug, 'activity']);

  // Finally the forum doc itself.
  await deleteDoc(doc(db, 'forums', forumSlug));
}

// ----- Mod actions: quarantine post ------------------------------------
export async function setPostQuarantine(
  forumSlug: string,
  postSlug: string,
  isQuarantined: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'forums', forumSlug, 'posts', postSlug), {
    isQuarantined,
  });
}

// ----- Hooks ------------------------------------------------------------

// True if the current user is in the forum's moderatorUids array.
export function useIsMod(forumSlug: string | undefined | null) {
  const { user } = useAuth();
  const [isMod, setIsMod] = useState(false);

  useEffect(() => {
    if (!user || !forumSlug) {
      setIsMod(false);
      return;
    }
    return onSnapshot(doc(db, 'forums', forumSlug), (snap) => {
      if (!snap.exists()) {
        setIsMod(false);
        return;
      }
      const mods: string[] = snap.data().moderatorUids ?? [];
      setIsMod(mods.includes(user.uid));
    });
  }, [user, forumSlug]);

  return isMod;
}

// True if the current user is muted in the given forum.
export function useIsMutedInForum(forumSlug: string | undefined | null) {
  const { user } = useAuth();
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!user || !forumSlug) {
      setMuted(false);
      return;
    }
    return onSnapshot(doc(db, 'forums', forumSlug, 'mutes', user.uid), (snap) => {
      setMuted(snap.exists());
    });
  }, [user, forumSlug]);

  return muted;
}

// Returns { timedOut, expiresAt } if the user has an active timeout.
export function useTimeoutStatus() {
  const { user } = useAuth();
  const [state, setState] = useState<{ timedOut: boolean; expiresAt: Date | null; reason?: string }>({
    timedOut: false,
    expiresAt: null,
  });

  useEffect(() => {
    if (!user) {
      setState({ timedOut: false, expiresAt: null });
      return;
    }
    return onSnapshot(doc(db, 'timeouts', user.uid), (snap) => {
      if (!snap.exists()) {
        setState({ timedOut: false, expiresAt: null });
        return;
      }
      const data = snap.data();
      const exp: Timestamp | null = data.expiresAt ?? null;
      const expMs = exp?.toMillis?.() ?? null;
      if (expMs !== null && expMs <= Date.now()) {
        setState({ timedOut: false, expiresAt: null });
        return;
      }
      setState({
        timedOut: true,
        expiresAt: expMs ? new Date(expMs) : null,
        reason: data.reason ?? undefined,
      });
    });
  }, [user]);

  return state;
}

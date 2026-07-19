import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
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
  reason: string,
): Promise<void> {
  await setDoc(doc(db, 'timeouts', uid), {
    type: 'ban',
    expiresAt: null,
    timedOutBy: byUid,
    timedOutByUsername: byUsername,
    reason,
    createdAt: serverTimestamp(),
  });
}

export async function liftBan(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'timeouts', uid));
}

// ----- Post pinning (admin-only) ----------------------------------------
export async function pinPost(forumSlug: string, postSlug: string): Promise<void> {
  await updateDoc(doc(db, 'forums', forumSlug, 'posts', postSlug), { isPinned: true });
}

export async function unpinPost(forumSlug: string, postSlug: string): Promise<void> {
  await updateDoc(doc(db, 'forums', forumSlug, 'posts', postSlug), { isPinned: false });
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

// ----- User-facing error helper -----------------------------------------
// Turns a Firestore / FirebaseError into a sentence we can put in an
// alert(). Permission-denied is by far the most common failure mode in
// this app — and almost always means firestore.rules wasn't redeployed
// after the admin list changed — so we call that out specifically.
// Prompt for the moderator-supplied reason shown to the affected user on
// their block banner. Returns the trimmed reason, or null if the admin
// cancelled or left it blank (an empty reason would defeat the point —
// the banner needs *something* to display).
export function promptModerationReason(action: string, targetUsername: string): string | null {
  const raw = window.prompt(`${action} @${targetUsername}.\n\nReason (shown to the user):`, '');
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (!trimmed) {
    window.alert('A reason is required.');
    return null;
  }
  return trimmed;
}

export function describeActionError(scope: string, err: unknown): string {
  const e = err as { code?: string; message?: string };
  const action = scope.replace(/-/g, ' ');
  if (e?.code === 'permission-denied') {
    return (
      `Could not ${action}. Firestore rules denied this. ` +
      `If you're an admin, ask whoever deploys the project to run ` +
      `"firebase deploy --only firestore:rules" so the latest rules are live.`
    );
  }
  return `Could not ${action}. ${e?.code ?? e?.message ?? 'Please try again.'}`;
}

// ----- Auto-mod block list ----------------------------------------------
// Backed by the `bad-words` package. We extend its default English list with
// extra slurs that aren't covered by default. There is intentionally no admin
// UI; the policy lives in version control.
import { Filter } from 'bad-words';

const EXTRA_BLOCKED = [
  'nigger', 'nigga', 'faggot', 'fag', 'tranny', 'retard', 'retarded',
  'chink', 'spic', 'kike', 'gook', 'wetback', 'coon', 'dyke',
  'paedo', 'paedophile', 'pedo', 'pedophile',
];

const filter = new Filter();
filter.addWords(...EXTRA_BLOCKED);

// Returns the offending word if the text contains one, else null. Splits on
// whitespace + punctuation so we can name which token tripped the filter.
export function violatesContentFilter(text: string): string | null {
  if (!text) return null;
  if (!filter.isProfane(text)) return null;
  const tokens = text.split(/[\s.,;:!?'"()[\]{}<>/\\|`~@#$%^&*_+=-]+/);
  for (const t of tokens) {
    if (t && filter.isProfane(t)) return t;
  }
  // Fallback: bad-words flagged the string but our tokenizer didn't catch
  // the word (e.g. concatenated profanity). Surface a generic placeholder.
  return '***';
}

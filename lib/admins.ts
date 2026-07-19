import { useUserProfile } from './user-profile';

// =============================================================================
// EDIT THIS LIST TO ADD / REMOVE ADMINS
// =============================================================================
// Admins are identified by their forum username (case-sensitive — exact match).
// Adding a username here grants client-side admin powers immediately on that
// user's next page load.
//
// IMPORTANT — keep this list in sync with the equivalent array inside the
// `isAdmin()` helper in `firestore.rules`. The Firestore rule file holds the
// server-side copy that's actually enforced for destructive operations
// (e.g. "Delete forum"). After editing both files, run:
//
//     firebase deploy --only firestore:rules
//
// The two lists must match for the Admin button + Admin panel to work
// end-to-end.
// =============================================================================
export const ADMIN_USERNAMES: string[] = [
  'thesomethingco.',
  '_burntsandwich',
  'siyuan',
  'zwe',
  'Epic_Blox5',
  'paul',
  'julwrites'
];

export function isAdminUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  return ADMIN_USERNAMES.includes(username);
}

// True when the currently signed-in user has an admin-listed username.
// This drives every client-side admin gate (Admin button visibility, "+ New
// forum" button, Delete forum action, etc.).
export function useIsServerAdmin(): boolean {
  const profile = useUserProfile();
  return isAdminUsername(profile?.username);
}
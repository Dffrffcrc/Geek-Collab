import { Platform } from 'react-native';
import {
  OAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';

// Firebase Auth OIDC provider ID for the GeeksHacking portal. Not a secret —
// this string is sent as a query param on every sign-in redirect. Baked in
// as a default because Metro's build-time env inlining has silently missed
// this variable in past deploys (its cache doesn't invalidate on .env
// changes), leaving the button perma-disabled with "not configured." The
// env var still wins if set, so it can be overridden per-environment.
const DEFAULT_PROVIDER_ID = 'oidc.geekshackingportal';
const providerId =
  process.env.EXPO_PUBLIC_FIREBASE_PORTAL_PROVIDER_ID?.trim() || DEFAULT_PROVIDER_ID;

export function isPortalAuthConfigured() {
  return Boolean(providerId);
}

function getPortalProvider() {
  if (!providerId) {
    throw new Error('Portal sign-in is not configured.');
  }
  const provider = new OAuthProvider(providerId);
  // `prompt: login` forces the OIDC provider to re-show its login page each
  // time. That's what the user wants while debugging: click the button and
  // see the portal, not silently succeed off a cached session.
  provider.setCustomParameters({ prompt: 'login' });
  provider.addScope('openid');
  provider.addScope('profile');
  provider.addScope('email');
  return provider;
}

// Firebase Auth stores a "pending redirect" marker in sessionStorage when
// signInWithRedirect fires. If the redirect fails halfway (e.g. the portal
// responds with a 404 because its OIDC config is wrong), the marker stays
// and subsequent sign-in attempts silently no-op — the symptom being
// "clicking the button does nothing until I clear browser data." This helper
// wipes those markers so the user can retry cleanly.
function clearStaleAuthRedirectState() {
  if (typeof window === 'undefined') return;
  try {
    const apiKey = auth.app.options.apiKey ?? '';
    const name = auth.name ?? '';
    sessionStorage.removeItem(`firebase:pendingRedirect:${apiKey}:${name}`);
    sessionStorage.removeItem(`firebase:redirectEvent:${apiKey}:${name}`);
    sessionStorage.removeItem(`firebase:redirectUser:${apiKey}:${name}`);
  } catch {
    // sessionStorage can throw on privacy modes / cross-origin iframes.
  }
}

// Popup is the primary path (avoids the persistent-redirect-state issue that
// forces users to clear browser data after a failed attempt). If the browser
// blocks popups — Safari private mode, iOS in-app browsers, some corporate
// networks — fall back to redirect. Popup-closed-by-user is left as an
// error so the UI can show a soft "sign-in cancelled" message.
//
// Profile creation is intentionally NOT done here. Once Firebase Auth has
// the user, AuthProvider notices there's no users/{uid} doc and routes to
// /complete-profile, where the user picks their own username/display name.
// Doing it here would either race with the profile-check or lock users into
// an auto-generated username.
export async function startPortalSignIn(): Promise<UserCredential | null> {
  if (Platform.OS !== 'web') {
    throw new Error('Portal sign-in is only supported on web in this app.');
  }

  // Wipe any dangling redirect markers from a previous failed attempt.
  clearStaleAuthRedirectState();

  // Sign out any lingering Firebase session before starting a fresh OIDC
  // round trip. Without this, a half-succeeded prior attempt leaves Firebase
  // holding a user session; the popup then silently "succeeds" against that
  // cached session and the portal is never shown. Combined with
  // `prompt: login`, this guarantees the user always sees the portal.
  if (auth.currentUser) {
    await signOut(auth).catch(() => {});
  }

  const provider = getPortalProvider();

  try {
    return await signInWithPopup(auth, provider);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

// Called once at app boot from AuthProvider. Only relevant when we fell back
// to the redirect path above; in the popup path it's a no-op (getRedirectResult
// returns null when there's no pending redirect).
export async function completePortalRedirect(): Promise<UserCredential | null> {
  if (Platform.OS !== 'web' || !isPortalAuthConfigured()) return null;
  return await getRedirectResult(auth).catch((err) => {
    console.warn('[portal-auth] getRedirectResult failed:', err);
    return null;
  });
}

export async function signOutPortalUser() {
  clearStaleAuthRedirectState();
  await signOut(auth);
}

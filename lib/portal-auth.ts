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



  provider.setCustomParameters({ prompt: 'login' });
  provider.addScope('openid');
  provider.addScope('profile');
  provider.addScope('email');
  return provider;
}







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












export async function startPortalSignIn(): Promise<UserCredential | null> {
  if (Platform.OS !== 'web') {
    throw new Error('Portal sign-in is only supported on web in this app.');
  }


  clearStaleAuthRedirectState();






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

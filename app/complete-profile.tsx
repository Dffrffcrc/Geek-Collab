import { useEffect, useState } from 'react';
import { Text, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { useTimeoutStatus } from '../lib/moderation';
import { signOutPortalUser } from '../lib/portal-auth';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { AuthLayout } from '../components/AuthLayout';
import { AuthScreenLoading } from '../components/AuthScreenLoading';
import { BannedScreen } from '../components/BannedScreen';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';

const MAX_DISPLAY_NAME = 40;
const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{1,20}$/;

// Signup step for users who've just authenticated through the OIDC portal
// but don't have a Firestore users/{uid} doc yet. Prompts them to pick a
// username and confirm their display name. Email is inherited from the
// OIDC identity and shown read-only.
//
// Not routable directly — the AuthProvider sets needsProfile=true when the
// profile is missing, and every top-level layout redirects here based on
// that flag. On successful submit we call refreshProfile() so the flag
// flips and the app routes into /forums.
export default function CompleteProfile() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 520;
  const { user, initializing, needsProfile, refreshProfile } = useAuth();
  const { banned, expiresAt, reason } = useTimeoutStatus();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Bounce to /login if not signed in, or to /forums if profile already
  // exists (they don't belong on this page anymore). Only run once state
  // has stabilised so we don't flap during initial mount.
  useEffect(() => {
    if (initializing) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!needsProfile) {
      router.replace('/forums');
      return;
    }
    // Prefill display name once from OIDC data. Guarded by `prefilled` so
    // typing doesn't get clobbered by a re-render.
    if (!prefilled) {
      const suggested =
        user.displayName?.trim() ||
        user.email?.split('@')[0] ||
        '';
      setDisplayName(suggested);
      setPrefilled(true);
    }
  }, [user, initializing, needsProfile, router, prefilled]);

  async function onSubmit() {
    setError(null);
    if (!user) return;

    const u = username.trim();
    const d = displayName.trim();
    if (!u || !d) {
      setError('Fill in both fields.');
      return;
    }
    if (!USERNAME_PATTERN.test(u)) {
      setError('Username: letters, numbers, _, . and - only. No spaces, max 20 characters.');
      return;
    }
    if (d.length > MAX_DISPLAY_NAME) {
      setError(`Display name must be ${MAX_DISPLAY_NAME} characters or fewer.`);
      return;
    }

    setBusy(true);
    try {
      const unameLower = u.toLowerCase();
      const userRef = doc(db, 'users', user.uid);
      const unameRef = doc(db, 'usernames', unameLower);

      await runTransaction(db, async (tx) => {
        const [profileSnap, unameSnap] = await Promise.all([
          tx.get(userRef),
          tx.get(unameRef),
        ]);
        if (profileSnap.exists()) {
          // Race — some other tab created it. Not an error, just proceed.
          return;
        }
        if (unameSnap.exists()) {
          throw new Error('__USERNAME_TAKEN__');
        }
        tx.set(userRef, {
          email: user.email ?? '',
          username: u,
          usernameLower: unameLower,
          displayName: d,
          phoneNumber: null,
          photoURL: null,
          authProvider: 'portal',
          createdAt: serverTimestamp(),
        });
        tx.set(unameRef, { uid: user.uid });
      });

      // Flip the app-wide needsProfile flag immediately so we don't wait for
      // the next auth-state fire before routing into /forums.
      await refreshProfile();
      router.replace('/forums');
    } catch (err: unknown) {
      console.error('[complete-profile] failed:', err);
      const msg = err instanceof Error ? err.message : 'Could not create profile.';
      if (msg === '__USERNAME_TAKEN__') {
        setError('That username is taken. Try another.');
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    // If a user lands here and decides they don't want to complete signup,
    // give them a way back to /login instead of trapping them.
    try {
      await signOutPortalUser();
    } catch {
      // best-effort
    }
    router.replace('/login');
  }

  if (initializing || !user || !needsProfile) {
    return <AuthScreenLoading />;
  }

  if (banned) {
    return <BannedScreen reason={reason} expiresAt={expiresAt} />;
  }

  return (
    <AuthLayout mobileCentered>
      <Text style={[styles.heading, isMobile && styles.headingMobile]}>
        Finish setting up your account
      </Text>
      <Text style={styles.body}>
        Signed in as <Text style={styles.emphasise}>{user.email ?? user.uid}</Text>. Pick a
        username other members will see next to your posts.
      </Text>

      <FormInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoComplete="username-new"
        autoCapitalize="none"
      />
      <FormInput
        placeholder="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
        maxLength={MAX_DISPLAY_NAME}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton label="Create account" onPress={onSubmit} loading={busy} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Wrong account? </Text>
        <Text style={styles.footerLink} onPress={onCancel}>
          Sign out
        </Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  heading: { color: COLORS.textPrimary, fontSize: 22, marginBottom: 12, fontFamily: HEADING_FONT },
  headingMobile: { fontSize: 18, marginBottom: 12, textAlign: 'left', lineHeight: 26 },
  body: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 18, fontFamily: BODY_FONT },
  emphasise: { color: COLORS.textPrimary, fontWeight: '700' },
  error: { color: COLORS.error, fontSize: 13, marginBottom: 8, fontFamily: BODY_FONT },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: COLORS.textMuted, fontSize: 12, fontFamily: BODY_FONT },
  footerLink: { color: COLORS.yellow, fontSize: 12, fontFamily: BODY_FONT, textDecorationLine: 'underline' },
});

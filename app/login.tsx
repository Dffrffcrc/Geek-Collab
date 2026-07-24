import { useEffect, useState } from 'react';
import { Text, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { AuthLayout } from '../components/AuthLayout';
import { PrimaryButton } from '../components/PrimaryButton';
import { AuthScreenLoading } from '../components/AuthScreenLoading';
import { useAuth } from '../lib/auth';
import { startPortalSignIn } from '../lib/portal-auth';
import { useTimeoutStatus } from '../lib/moderation';
import { BannedScreen } from '../components/BannedScreen';

export default function Login() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 520;
  const { user, initializing, needsProfile, authError } = useAuth();
  const { banned, expiresAt, reason } = useTimeoutStatus();
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (initializing || !user || banned) return;
    router.replace(needsProfile ? '/complete-profile' : '/forums');
  }, [initializing, needsProfile, router, user, banned]);

  // Surface any error the AuthProvider caught while completing a portal
  // redirect (e.g. cancelled sign-in, bad state token).
  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  async function onPortalLogin() {
    setError(null);
    setPortalLoading(true);
    try {
      await startPortalSignIn();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      // Popup dismissed by the user isn't really an error — just quiet it.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error('[login] portal sign-in failed:', err);
      const message = err instanceof Error ? err.message : 'Portal sign-in failed.';
      setError(message);
    } finally {
      setPortalLoading(false);
    }
  }

  if (initializing) {
    return <AuthScreenLoading />;
  }

  if (user && banned) {
    return <BannedScreen reason={reason} expiresAt={expiresAt} />;
  }

  return (
    <AuthLayout mobileCentered>
      <Text style={[styles.heading, isMobile && styles.headingMobile]}>
        Log in to forum.geekshacking:
      </Text>
      <Text style={styles.body}>
        Sign in with your GeeksHacking account through the portal.
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton
        label="Continue with GeeksHacking Portal"
        onPress={onPortalLogin}
        loading={portalLoading}
      />
      {Platform.OS !== 'web' && (
        <Text style={styles.note}>Portal sign-in is available on web only.</Text>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  heading: { color: COLORS.textPrimary, fontSize: 22, marginBottom: 12, fontFamily: HEADING_FONT },
  headingMobile: { fontSize: 18, marginBottom: 16, textAlign: 'left', lineHeight: 28 },
  body: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 18, fontFamily: BODY_FONT },
  error: { color: COLORS.error, fontSize: 13, marginBottom: 8, fontFamily: BODY_FONT },
  note: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginTop: 16, fontFamily: BODY_FONT },
});

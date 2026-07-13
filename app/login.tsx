import { useEffect, useState } from 'react';
import { Text, StyleSheet, View, useWindowDimensions, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { AuthLayout } from '../components/AuthLayout';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../lib/auth';
import { isPortalAuthConfigured, startPortalSignIn } from '../lib/portal-auth';
import { requiresEmailVerification } from '../lib/auth-utils';
import { AuthScreenLoading } from '../components/AuthScreenLoading';

export default function Login() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 520;
  const { user, initializing, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (initializing || !user) return;
    router.replace(requiresEmailVerification(user) ? '/verify-email' : '/forums');
  }, [initializing, router, user]);

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  async function onPortalLogin() {
    setError(null);
    setPortalLoading(true);
    try {
      await startPortalSignIn();
    } catch (err: unknown) {
      console.error('[login] portal sign-in failed:', err);
      const message = err instanceof Error ? err.message : 'Portal sign-in failed.';
      setError(message);
    } finally {
      setPortalLoading(false);
    }
  }

  async function onSubmit() {
    setError(null);
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError('Enter your email address and password.');
      return;
    }
    if (!normalizedEmail.includes('@')) {
      setError('Use your email address to sign in.');
      return;
    }
    setPasswordLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      if (requiresEmailVerification(cred.user)) router.replace('/verify-email');
      else router.replace('/forums');
    } catch (err: unknown) {
      console.error('[login] failed:', err);
      const e = err as { code?: string; message?: string };
      const friendly = mapAuthError(e.code);
      setError(friendly ?? `Could not log in (${e.code ?? e.message ?? 'unknown error'}).`);
    } finally {
      setPasswordLoading(false);
    }
  }

  if (initializing) {
    return <AuthScreenLoading />;
  }

  return (
    <AuthLayout mobileCentered>
      <Text style={[styles.heading, isMobile && styles.headingMobile]}>Log in to forum.geekshacking:</Text>
      <FormInput
        placeholder="Email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <FormInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton
        label="Continue with GeeksHacking Portal"
        onPress={onPortalLogin}
        loading={portalLoading}
        disabled={!isPortalAuthConfigured()}
      />
      <Text style={styles.portalHint}>
        Sign in with GitHub through the GeeksHacking portal.
      </Text>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or use email</Text>
        <View style={styles.divider} />
      </View>
      <PrimaryButton label="Log in" onPress={onSubmit} loading={passwordLoading} />
      <View style={[styles.forgotRow, isMobile && styles.forgotRowMobile]}>
        <Link href="/forgot-password" style={styles.footerLink}>
          Forgot password?
        </Link>
      </View>
      <View style={[styles.footer, isMobile && styles.footerMobile]}>
        <Text style={[styles.footerText, isMobile && styles.footerTextMobile]}>Don't have an account? </Text>
        <Link href="/signup" style={styles.footerLink}>
          Sign up here
        </Link>
      </View>
      {Platform.OS !== 'web' && (
        <Text style={styles.note}>Portal sign-in is currently available on web only.</Text>
      )}
    </AuthLayout>
  );
}

function mapAuthError(code?: string) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong username/email or password.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed':
      return "Couldn't reach the server. Please check your internet connection.";
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  heading: { color: COLORS.textPrimary, fontSize: 22, marginBottom: 18, fontFamily: HEADING_FONT },
  headingMobile: { fontSize: 18, marginBottom: 22, textAlign: 'left', lineHeight: 28 },
  error: { color: COLORS.error, fontSize: 13, marginBottom: 8, fontFamily: BODY_FONT },
  portalHint: { color: COLORS.textMuted, fontSize: 12, marginTop: 8, textAlign: 'center', fontFamily: BODY_FONT },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 4 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.separator },
  dividerText: { color: COLORS.textMuted, fontSize: 11, fontFamily: BODY_FONT },
  forgotRow: { alignItems: 'flex-end', marginTop: 12 },
  forgotRowMobile: { marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 28 },
  footerMobile: { justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' },
  footerText: { color: COLORS.textMuted, fontSize: 12, fontFamily: BODY_FONT },
  footerTextMobile: { textAlign: 'center' },
  footerLink: { color: COLORS.yellow, fontSize: 12, fontFamily: BODY_FONT },
  note: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginTop: 16, fontFamily: BODY_FONT },
});

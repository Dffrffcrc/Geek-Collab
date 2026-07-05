import { useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { AuthLayout } from '../components/AuthLayout';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';

export default function ForgotPassword() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!identifier.trim()) {
      setError('Enter your username or email address.');
      return;
    }
    setLoading(true);
    try {
      let email = identifier.trim();
      // Mirror login.tsx: accept either a username or an email. Username lookup
      // goes through the public /usernames index since /users is auth-gated.
      if (!email.includes('@')) {
        const lookup = await getDoc(doc(db, 'usernames', email.toLowerCase()));
        if (!lookup.exists() || !lookup.data().email) {
          // Don't disclose whether the account exists — show the same success
          // screen either way so the form can't be used to enumerate usernames.
          setSent(true);
          return;
        }
        email = lookup.data().email;
      }
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      // auth/user-not-found is also silenced into success for the same
      // anti-enumeration reason as above.
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-email') {
        setSent(true);
        return;
      }
      console.error('[forgot-password] failed:', err);
      setError(mapAuthError(e.code) ?? `Could not send the email (${e.code ?? e.message ?? 'unknown error'}).`);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout mobileCentered>
        <Text style={styles.heading}>Check your inbox</Text>
        <Text style={styles.body}>
          If an account exists for that username or email, we've sent it a password reset link.
          The link expires after a short time — request another one if it does.
        </Text>
        <View style={{ marginTop: 18 }}>
          <PrimaryButton label="Back to log in" onPress={() => router.replace('/login')} />
        </View>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout mobileCentered>
      <Text style={styles.heading}>Reset your password</Text>
      <Text style={styles.body}>
        Enter your username or the email address on your account. We'll send you a link to choose
        a new password.
      </Text>
      <View style={{ height: 18 }} />
      <FormInput
        placeholder="Username or email address"
        value={identifier}
        onChangeText={setIdentifier}
        autoComplete="username"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton label="Send reset link" onPress={onSubmit} loading={loading} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>Remembered it? </Text>
        <Link href="/login" style={styles.footerLink}>
          Back to log in
        </Link>
      </View>
    </AuthLayout>
  );
}

function mapAuthError(code?: string) {
  switch (code) {
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed':
      return "Couldn't reach the server. Please check your internet connection.";
    case 'permission-denied':
      return 'Firestore rules denied this read. Re-deploy firestore.rules.';
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  heading: { color: COLORS.textPrimary, fontSize: 22, marginBottom: 12, fontFamily: HEADING_FONT },
  body: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, fontFamily: BODY_FONT },
  error: { color: COLORS.error, fontSize: 13, marginBottom: 8, fontFamily: BODY_FONT },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 28 },
  footerText: { color: COLORS.textMuted, fontSize: 12, fontFamily: BODY_FONT },
  footerLink: { color: COLORS.yellow, fontSize: 12, fontFamily: BODY_FONT },
});

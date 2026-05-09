import { useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { AuthLayout } from '../components/AuthLayout';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';

export default function Login() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!identifier || !password) {
      setError('Enter your username/email and password.');
      return;
    }
    setLoading(true);
    try {
      let email = identifier.trim();
      // Username login: look up the email in the public usernames index.
      // (Reading the users collection requires auth, so we can't use it here.)
      if (!email.includes('@')) {
        const lookup = await getDoc(doc(db, 'usernames', email.toLowerCase()));
        if (!lookup.exists()) {
          setError('No account found with that username.');
          setLoading(false);
          return;
        }
        const data = lookup.data();
        if (!data.email) {
          setError('This account is missing email metadata. Try logging in with your email address.');
          setLoading(false);
          return;
        }
        email = data.email;
      }
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) router.replace('/verify-email');
      else router.replace('/forums');
    } catch (err: unknown) {
      console.error('[login] failed:', err);
      const e = err as { code?: string; message?: string };
      const friendly = mapAuthError(e.code);
      setError(friendly ?? `Could not log in (${e.code ?? e.message ?? 'unknown error'}).`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Text style={styles.heading}>Log in to forum.geekshacking:</Text>
      <FormInput
        placeholder="Username or email address"
        value={identifier}
        onChangeText={setIdentifier}
        autoComplete="username"
      />
      <FormInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton label="Log in" onPress={onSubmit} loading={loading} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Link href="/signup" style={styles.footerLink}>
          Sign up here
        </Link>
      </View>
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
    case 'permission-denied':
      return 'Firestore rules denied this read. Re-deploy firestore.rules.';
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  heading: { color: COLORS.textPrimary, fontSize: 22, marginBottom: 18, fontFamily: HEADING_FONT },
  error: { color: COLORS.error, fontSize: 13, marginBottom: 8, fontFamily: BODY_FONT },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 28 },
  footerText: { color: COLORS.textMuted, fontSize: 12, fontFamily: BODY_FONT },
  footerLink: { color: COLORS.yellow, fontSize: 12, fontFamily: BODY_FONT },
});

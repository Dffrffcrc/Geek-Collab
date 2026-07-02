import { useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { AuthLayout } from '../components/AuthLayout';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { PasswordStrength, passwordScore } from '../components/PasswordStrength';

const MIN_PASSWORD_LENGTH = 8;
const REQUIRED_STRENGTH = 4;
const MAX_DISPLAY_NAME_LENGTH = 35;

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    const e = email.trim();
    const u = username.trim();
    const d = displayName.trim();

    if (!e || !u || !d || !password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]{1,20}$/.test(u)) {
      setError('Username can only contain letters, numbers, _, . and -, with no spaces (max 20 characters).');
      return;
    }
    if (d.length > MAX_DISPLAY_NAME_LENGTH) {
      setError(`Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (passwordScore(password) < REQUIRED_STRENGTH) {
      setError('Password must contain characters with upper & lower case, numbers, and a symbol.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const uname = u.toLowerCase();
      const taken = await getDoc(doc(db, 'usernames', uname));
      if (taken.exists()) {
        setError('That username is taken.');
        setLoading(false);
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, e, password);
      await updateProfile(cred.user, { displayName: d });
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: e,
        username: u,
        usernameLower: uname,
        displayName: d,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'usernames', uname), { uid: cred.user.uid });
      await sendEmailVerification(cred.user);
      router.replace('/verify-email');
    } catch (err: unknown) {
      console.error('[signup] failed:', err);
      const e = err as { code?: string; message?: string };
      const friendly = mapAuthError(e.code);
      setError(friendly ?? `Could not create account (${e.code ?? e.message ?? 'unknown error'}).`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout mobileCentered>
      <Text style={styles.heading}>Sign up for forum.geekshacking:</Text>
      <FormInput
        placeholder="Email Address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
      />
      <FormInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoComplete="username-new"
      />
      <FormInput
        placeholder="Display Name"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
        maxLength={MAX_DISPLAY_NAME_LENGTH}
      />
      <FormInput
        placeholder={`Password (at least ${MIN_PASSWORD_LENGTH} characters)`}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      <PasswordStrength password={password} />
      <FormInput
        placeholder="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton label="Sign up" onPress={onSubmit} loading={loading} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>Have an account? </Text>
        <Link href="/login" style={styles.footerLink}>
          Log in here
        </Link>
      </View>
    </AuthLayout>
  );
}

function mapAuthError(code?: string) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase: Email thesomethingcompany.inc@gmail.com for assistance.';
    case 'auth/network-request-failed':
      return 'Network error: please check your internet connection.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return 'Invalid Firebase API key: Email thesomethingcompany.inc@gmail.com for assistance.';
    case 'permission-denied':
      return 'Firestore rules denied this write: Email thesomethingcompany.inc@gmail.com for assistance.';
    case 'unavailable':
    case 'failed-precondition':
      return 'Firestore is unreachable or not yet created: Email thesomethingcompany.inc@gmail.com for assistance.';
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

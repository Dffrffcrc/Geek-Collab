import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { sendEmailVerification, signOut, reload } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { AuthLayout } from '../components/AuthLayout';
import { PrimaryButton } from '../components/PrimaryButton';

export default function VerifyEmail() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.emailVerified) {
      router.replace('/home');
      return;
    }
    // Poll every 5s so the screen advances automatically once they click the link.
    const id = setInterval(async () => {
      try {
        if (!auth.currentUser) return;
        await reload(auth.currentUser);
        if (auth.currentUser.emailVerified) router.replace('/home');
      } catch {
        // ignore transient errors
      }
    }, 5000);
    return () => clearInterval(id);
  }, [user, initializing, router]);

  async function manualCheck() {
    if (!auth.currentUser) return;
    setChecking(true);
    setInfo(null);
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) router.replace('/home');
      else setInfo('Still not verified. Check your inbox (and spam folder).');
    } finally {
      setChecking(false);
    }
  }

  async function resend() {
    if (!auth.currentUser) return;
    setResending(true);
    setInfo(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setInfo('Verification email sent again.');
    } catch {
      setInfo('Could not resend right now. Try again in a minute.');
    } finally {
      setResending(false);
    }
  }

  async function useDifferentAccount() {
    await signOut(auth);
    router.replace('/login');
  }

  return (
    <AuthLayout>
      <Text style={styles.heading}>Verify your email</Text>
      <Text style={styles.body}>
        We sent a verification link to {user?.email ?? 'your email'}. Click the link in that email
        to finish creating your account, this page will move you forward automatically.
      </Text>
      {info && <Text style={styles.info}>{info}</Text>}
      <PrimaryButton label="I've verified" onPress={manualCheck} loading={checking} />
      <TouchableOpacity style={styles.secondary} onPress={resend} disabled={resending}>
        <Text style={styles.secondaryText}>{resending ? 'Sending…' : 'Resend email'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={useDifferentAccount}>
        <Text style={styles.linkText}>Use a different account</Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  heading: { color: COLORS.textPrimary, fontSize: 24, marginBottom: 12, textAlign: 'center', fontFamily: HEADING_FONT },
  body: { color: '#bbb', fontSize: 14, marginBottom: 16, textAlign: 'center', lineHeight: 20, fontFamily: BODY_FONT },
  info: { color: COLORS.yellow, fontSize: 13, marginBottom: 8, textAlign: 'center', fontFamily: BODY_FONT },
  secondary: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryText: { color: COLORS.textPrimary, fontSize: 15, fontFamily: BODY_FONT },
  linkText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    fontFamily: BODY_FONT,
  },
});

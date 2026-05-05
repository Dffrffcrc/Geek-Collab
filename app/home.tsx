import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';

export default function Home() {
  const router = useRouter();
  const { user, initializing } = useAuth();

  useEffect(() => {
    if (initializing) return;
    if (!user) router.replace('/login');
    else if (!user.emailVerified) router.replace('/verify-email');
  }, [user, initializing, router]);

  if (!user || !user.emailVerified) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Welcome, {user.displayName || user.email}!</Text>
      <Text style={styles.body}>This is where the forum will live.</Text>
      <TouchableOpacity style={styles.button} onPress={() => signOut(auth)}>
        <Text style={styles.buttonText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark, padding: 24 },
  heading: { color: COLORS.textPrimary, fontSize: 28, marginBottom: 12, fontFamily: HEADING_FONT },
  body: { color: COLORS.textMuted, fontSize: 14, marginBottom: 24, fontFamily: BODY_FONT },
  button: { backgroundColor: COLORS.yellow, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  buttonText: { color: '#000', fontWeight: '700', fontFamily: BODY_FONT },
});

import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import AdminPanel from '../components/AdminPanel';

export default function Home() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (initializing) return;
    if (!user) router.replace('/login');
    else if (!user.emailVerified) router.replace('/verify-email');
    else {
      // Check if user is admin by custom claims or custom field
      user.getIdTokenResult().then((tokenResult) => {
        setIsAdmin(tokenResult.claims.admin === true);
      });
    }
  }, [user, initializing, router]);

  if (!user || !user.emailVerified) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Welcome, {user.displayName || user.email}!</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => setShowAdminPanel(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="shield" size={24} color={COLORS.yellow} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.body}>This is where the forum will live.</Text>
        <TouchableOpacity style={styles.button} onPress={() => signOut(auth)}>
          <Text style={styles.buttonText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Admin Panel */}
      <AdminPanel
        userId={user.uid}
        username={user.displayName || user.email || 'User'}
        visible={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  heading: { color: COLORS.textPrimary, fontSize: 24, fontFamily: HEADING_FONT, fontWeight: '700' },
  adminButton: {
    padding: 8,
  },
  contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  body: { color: COLORS.textMuted, fontSize: 14, marginBottom: 24, fontFamily: BODY_FONT },
  button: { backgroundColor: COLORS.yellow, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  buttonText: { color: '#000', fontWeight: '700', fontFamily: BODY_FONT },
});

import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, type Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { useIsServerAdmin } from '../../../lib/admins';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { isClosed } from '../../../lib/forum-utils';
import { ForumRow } from '../../../components/ForumRow';

type Forum = {
  slug: string;
  name: string;
  description: string;
  closesAt: Timestamp;
  createdAt: Timestamp;
};

export default function ActiveForums() {
  const router = useRouter();
  const { user } = useAuth();
  const admin = useIsServerAdmin();
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const [forums, setForums] = useState<Forum[] | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'forums'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setForums(snap.docs.map((d) => ({ slug: d.id, ...(d.data() as Omit<Forum, 'slug'>) })));
    });
  }, []);

  const active = forums?.filter((f) => !isClosed(f.closesAt)) ?? [];

  return (
    <ScrollView contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}>
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Text style={[styles.heading, compact && styles.headingCompact]}>Active Forums</Text>
        {admin && (
          <TouchableOpacity style={styles.createButton} onPress={() => router.push('/forums/new')}>
            <Text style={styles.createLabel}>+ New forum</Text>
          </TouchableOpacity>
        )}
      </View>

      {forums === null ? (
        <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 32 }} />
      ) : active.length === 0 ? (
        <Text style={styles.empty}>No active forums right now.</Text>
      ) : (
        active.map((f) => (
          <ForumRow key={f.slug} forum={f} onPress={() => router.push(`/forums/${f.slug}`)} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64 },
  scrollCompact: { padding: 16, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerCompact: { alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 32 },
  headingCompact: { fontSize: 26 },
  createButton: {
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createLabel: { color: '#000', fontFamily: BODY_FONT, fontWeight: '700' },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginTop: 16 },
});

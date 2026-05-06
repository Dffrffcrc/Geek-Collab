import { useEffect, useState } from 'react';
import { Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, type Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
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

export default function PastForums() {
  const router = useRouter();
  const [forums, setForums] = useState<Forum[] | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'forums'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setForums(snap.docs.map((d) => ({ slug: d.id, ...(d.data() as Omit<Forum, 'slug'>) })));
    });
  }, []);

  const past = forums?.filter((f) => isClosed(f.closesAt)) ?? [];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Past Forums</Text>
      <Text style={styles.subheading}>Read-only · these forums have closed.</Text>

      {forums === null ? (
        <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 32 }} />
      ) : past.length === 0 ? (
        <Text style={styles.empty}>No past forums yet.</Text>
      ) : (
        past.map((f) => (
          <ForumRow key={f.slug} forum={f} closed onPress={() => router.push(`/forums/${f.slug}`)} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 32, marginBottom: 6 },
  subheading: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 24 },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginTop: 16 },
});

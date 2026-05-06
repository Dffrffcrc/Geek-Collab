import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import {
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
  orderBy,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { useUserProfile } from '../../../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { Avatar } from '../../../components/Avatar';
import { timeAgo } from '../../../lib/forum-utils';
import { useRouter } from 'expo-router';

type AuthoredPost = {
  forumSlug: string;
  postSlug: string;
  title: string;
  createdAt: Timestamp;
};

export default function MyProfile() {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useUserProfile();
  const [posts, setPosts] = useState<AuthoredPost[] | null>(null);

  // Load posts authored by the user across all forums (collection group query).
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const q = query(
          collectionGroup(db, 'posts'),
          where('authorUid', '==', user.uid),
          orderBy('createdAt', 'desc'),
        );
        const snap = await getDocs(q);
        const items: AuthoredPost[] = snap.docs.map((d) => {
          const data = d.data();
          // path: forums/{forumSlug}/posts/{postSlug}
          const segments = d.ref.path.split('/');
          return {
            forumSlug: segments[1],
            postSlug: segments[3],
            title: data.title,
            createdAt: data.createdAt,
          };
        });
        setPosts(items);
      } catch (err) {
        // Collection group queries need an index — log so we can build one.
        console.warn('[profile:posts] failed (likely needs Firestore index):', err);
        setPosts([]);
      }
    })();
  }, [user]);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Avatar size={88} label={profile?.displayName ?? profile?.username} />
        <View style={{ marginLeft: 18, flex: 1 }}>
          <Text style={styles.name}>{profile?.displayName ?? '...'}</Text>
          <Text style={styles.username}>@{profile?.username ?? '...'}</Text>
          <Text style={styles.email}>{profile?.email ?? ''}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Your posts</Text>
      {posts === null ? (
        <ActivityIndicator color={COLORS.yellow} />
      ) : posts.length === 0 ? (
        <Text style={styles.empty}>You haven't posted anything yet.</Text>
      ) : (
        posts.map((p) => (
          <View key={`${p.forumSlug}/${p.postSlug}`} style={styles.postRow}>
            <Text style={styles.postTitle} onPress={() => router.push(`/forums/${p.forumSlug}/${p.postSlug}`)}>
              {p.title}
            </Text>
            <Text style={styles.postMeta}>
              in {p.forumSlug} · {timeAgo(p.createdAt)}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.todo}>
        Profile editing (display name, avatar) is coming soon.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64, maxWidth: 720 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  name: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 26 },
  username: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, marginTop: 4 },
  email: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4 },
  sectionHeader: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18, marginBottom: 14 },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13 },
  postRow: { backgroundColor: '#2a2a2a', borderRadius: 10, padding: 14, marginBottom: 10 },
  postTitle: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 16 },
  postMeta: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4 },
  todo: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: 32, fontStyle: 'italic' },
});

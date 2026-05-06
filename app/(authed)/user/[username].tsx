import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  doc,
  getDoc,
  collectionGroup,
  query,
  where,
  orderBy,
  getDocs,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { Avatar } from '../../../components/Avatar';
import { timeAgo } from '../../../lib/forum-utils';

type Profile = { uid: string; username: string; displayName: string };
type AuthoredPost = { forumSlug: string; postSlug: string; title: string; createdAt: Timestamp };

export default function PublicProfile() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [posts, setPosts] = useState<AuthoredPost[] | null>(null);

  useEffect(() => {
    if (!username) return;
    (async () => {
      // Username -> uid via the public usernames index.
      const lookup = await getDoc(doc(db, 'usernames', username.toLowerCase()));
      if (!lookup.exists()) {
        setProfile(null);
        return;
      }
      const uid = lookup.data().uid as string;
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (!userSnap.exists()) {
        setProfile(null);
        return;
      }
      const data = userSnap.data();
      setProfile({ uid, username: data.username, displayName: data.displayName });

      try {
        const q = query(
          collectionGroup(db, 'posts'),
          where('authorUid', '==', uid),
          orderBy('createdAt', 'desc'),
        );
        const snap = await getDocs(q);
        setPosts(
          snap.docs.map((d) => {
            const segs = d.ref.path.split('/');
            return {
              forumSlug: segs[1],
              postSlug: segs[3],
              title: d.data().title,
              createdAt: d.data().createdAt,
            };
          }),
        );
      } catch (err) {
        console.warn('[profile:public:posts] failed:', err);
        setPosts([]);
      }
    })();
  }, [username]);

  if (profile === undefined) {
    return <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 32 }} />;
  }
  if (profile === null) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>User @{username} not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Avatar size={88} label={profile.displayName} />
        <View style={{ marginLeft: 18, flex: 1 }}>
          <Text style={styles.name}>{profile.displayName}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Posts</Text>
      {posts === null ? (
        <ActivityIndicator color={COLORS.yellow} />
      ) : posts.length === 0 ? (
        <Text style={styles.empty}>No posts yet.</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64, maxWidth: 720 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  name: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 26 },
  username: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, marginTop: 4 },
  sectionHeader: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18, marginBottom: 14 },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13 },
  postRow: { backgroundColor: '#2a2a2a', borderRadius: 10, padding: 14, marginBottom: 10 },
  postTitle: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 16 },
  postMeta: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4 },
  notFound: { padding: 32 },
  notFoundText: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 14 },
});

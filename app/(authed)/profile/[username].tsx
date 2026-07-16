import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { Avatar } from '../../../components/Avatar';
import { UserRoleTags } from '../../../components/RoleTag';
import { timeAgo } from '../../../lib/forum-utils';

type Profile = { uid: string; username: string; displayName: string };
type AuthoredPost = { forumSlug: string; postSlug: string; title: string; createdAt: Timestamp };

export default function PublicProfile() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 768;
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
        const forumsSnap = await getDocs(collection(db, 'forums'));
        const postLists = await Promise.all(
          forumsSnap.docs.map(async (forumDoc) => {
            const postsSnap = await getDocs(
              query(
                collection(db, 'forums', forumDoc.id, 'posts'),
                where('authorUid', '==', uid),
                orderBy('createdAt', 'desc'),
              ),
            );
            // Hide soft-deleted posts from other people's profiles too.
            return postsSnap.docs
              .filter((d) => d.data().isDeleted !== true)
              .map((d) => ({
                forumSlug: forumDoc.id,
                postSlug: d.id,
                title: d.data().title,
                createdAt: d.data().createdAt,
              }));
          }),
        );
        setPosts(
          postLists
            .flat()
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)),
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
    <ScrollView contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}>
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Avatar size={88} label={profile.displayName} />
        <View style={{ marginLeft: compact ? 0 : 18, marginTop: compact ? 14 : 0, flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, compact && styles.nameCompact]}>{profile.displayName}</Text>
            <UserRoleTags username={profile.username} />
          </View>
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
  scrollCompact: { padding: 16, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  headerCompact: { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 26 },
  nameCompact: { fontSize: 22 },
  username: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, marginTop: 4 },
  sectionHeader: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18, marginBottom: 14 },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13 },
  postRow: { backgroundColor: '#2a2a2a', borderRadius: 10, padding: 14, marginBottom: 10 },
  postTitle: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 16 },
  postMeta: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4 },
  notFound: { padding: 32 },
  notFoundText: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 14 },
});

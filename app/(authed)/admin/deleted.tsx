import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collectionGroup, onSnapshot, orderBy, query, where, type Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { useUserProfile } from '../../../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { previewText, timeAgo } from '../../../lib/forum-utils';
import { restorePost, banUser } from '../../../lib/admin-tools';
import { logActivity } from '../../../lib/moderation';
import { FormInput } from '../../../components/FormInput';

type DeletedPost = {
  id: string;
  forumSlug: string;
  title: string;
  body: string;
  authorUid: string;
  authorUsername: string;
  createdAt: Timestamp;
  deletedAt?: Timestamp;
  deletedByUsername?: string;
};

export default function AdminDeleted() {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useUserProfile();

  const [posts, setPosts] = useState<DeletedPost[] | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(
      collectionGroup(db, 'posts'),
      where('isDeleted', '==', true),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(
      q,
      (snap) => {
        setPosts(
          snap.docs.map((d) => {
            const segments = d.ref.path.split('/');
            const data = d.data();
            return {
              id: d.id,
              forumSlug: segments[1],
              title: data.title,
              body: data.body,
              authorUid: data.authorUid,
              authorUsername: data.authorUsername,
              createdAt: data.createdAt,
              deletedAt: data.deletedAt,
              deletedByUsername: data.deletedByUsername,
            };
          }),
        );
      },
      (err) => {
        console.warn('[admin:deleted] failed (likely needs index):', err);
        setPosts([]);
      },
    );
  }, []);

  const filtered = useMemo(() => {
    if (!posts) return [];
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.body ?? '').toLowerCase().includes(q) ||
        p.authorUsername.toLowerCase().includes(q) ||
        p.forumSlug.toLowerCase().includes(q),
    );
  }, [posts, search]);

  async function restore(forumSlug: string, postSlug: string) {
    if (!user || !profile) return;
    try {
      await restorePost(forumSlug, postSlug);
      logActivity(forumSlug, user.uid, profile.username, 'post_unquarantined', {
        targetType: 'post',
        targetId: postSlug,
        details: 'restored from deleted',
      });
    } catch (err) {
      console.error('[admin:restore] failed:', err);
    }
  }

  async function ban(uid: string, username: string, forumSlug: string) {
    if (!user || !profile) return;
    if (!confirm(`Ban @${username} from the entire app?`)) return;
    try {
      await banUser(uid, user.uid, profile.username);
      logActivity(forumSlug, user.uid, profile.username, 'user_timed_out', {
        targetType: 'user',
        targetId: uid,
        details: `${username} (banned)`,
      });
    } catch (err) {
      console.error('[admin:deleted:ban] failed:', err);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Deleted posts</Text>
      <Text style={styles.sub}>
        Soft-deleted posts across every forum. Restore returns them to the forum.
      </Text>

      <FormInput placeholder="Search title / body / author / forum…" value={search} onChangeText={setSearch} />

      {posts === null ? (
        <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 24 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>Nothing deleted.</Text>
      ) : (
        filtered.map((p) => (
          <View key={`${p.forumSlug}/${p.id}`} style={styles.card}>
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.meta}>
              by{' '}
              <Text style={styles.username} onPress={() => router.push(`/user/${p.authorUsername}`)}>
                @{p.authorUsername}
              </Text>{' '}
              in {p.forumSlug} · posted {timeAgo(p.createdAt)}
              {p.deletedAt ? `, deleted ${timeAgo(p.deletedAt)}` : ''}
              {p.deletedByUsername ? ` by @${p.deletedByUsername}` : ''}
            </Text>
            {!!p.body && <Text style={styles.body}>{previewText(p.body, 220)}</Text>}
            <View style={styles.actions}>
              <ActBtn label="View" onPress={() => router.push(`/forums/${p.forumSlug}/${p.id}` as never)} />
              <ActBtn label="Restore" onPress={() => restore(p.forumSlug, p.id)} />
              <ActBtn label="Ban author" destructive onPress={() => ban(p.authorUid, p.authorUsername, p.forumSlug)} />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ActBtn({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.actBtn, destructive && styles.actBtnDestructive]}>
      <Text style={[styles.actBtnLabel, destructive && styles.actBtnLabelDestructive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 24, marginBottom: 4 },
  sub: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 16, lineHeight: 18 },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginTop: 16 },
  card: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 12, opacity: 0.85 },
  title: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 18, marginBottom: 4 },
  meta: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginBottom: 8 },
  username: { color: COLORS.yellow, fontWeight: '700' },
  body: { color: '#cccccc', fontFamily: BODY_FONT, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: '#3a3a3a',
  },
  actBtnDestructive: { borderColor: COLORS.error },
  actBtnLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  actBtnLabelDestructive: { color: COLORS.error },
});

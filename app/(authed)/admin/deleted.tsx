import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collectionGroup, onSnapshot, orderBy, query, where, type Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { useUserProfile } from '../../../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { previewText, timeAgo } from '../../../lib/forum-utils';
import { restorePost, restoreComment, banUser, promptModerationReason } from '../../../lib/admin-tools';
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

type DeletedComment = {
  id: string;
  forumSlug: string;
  postSlug: string;
  body: string;
  authorUid: string;
  authorUsername: string;
  createdAt: Timestamp;
  deletedAt?: Timestamp;
  deletedByUsername?: string;
};

type Tab = 'posts' | 'comments';

export default function AdminDeleted() {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useUserProfile();

  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<DeletedPost[] | null>(null);
  const [comments, setComments] = useState<DeletedComment[] | null>(null);
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
        console.warn('[admin:deleted] posts failed (likely needs index):', err);
        setPosts([]);
      },
    );
  }, []);

  useEffect(() => {
    // Comments live in `forums/{slug}/posts/{postId}/comments/{commentId}`,
    // so we use a collection-group query keyed by isDeleted. Needs the
    // matching collection-group index in firestore.indexes.json.
    const q = query(
      collectionGroup(db, 'comments'),
      where('isDeleted', '==', true),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(
      q,
      (snap) => {
        setComments(
          snap.docs.map((d) => {
            const segments = d.ref.path.split('/');
            const data = d.data();
            return {
              id: d.id,
              forumSlug: segments[1],
              postSlug: segments[3],
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
        console.warn('[admin:deleted] comments failed (likely needs index):', err);
        setComments([]);
      },
    );
  }, []);

  const filteredPosts = useMemo(() => {
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

  const filteredComments = useMemo(() => {
    if (!comments) return [];
    const q = search.trim().toLowerCase();
    if (!q) return comments;
    return comments.filter(
      (c) =>
        (c.body ?? '').toLowerCase().includes(q) ||
        c.authorUsername.toLowerCase().includes(q) ||
        c.forumSlug.toLowerCase().includes(q) ||
        c.postSlug.toLowerCase().includes(q),
    );
  }, [comments, search]);

  async function restoreP(forumSlug: string, postSlug: string) {
    if (!user || !profile) return;
    try {
      await restorePost(forumSlug, postSlug);
      logActivity(forumSlug, user.uid, profile.username, 'post_unquarantined', {
        targetType: 'post',
        targetId: postSlug,
        details: 'restored from deleted',
      });
    } catch (err) {
      console.error('[admin:restore-post] failed:', err);
    }
  }

  async function restoreC(forumSlug: string, postSlug: string, commentId: string) {
    if (!user || !profile) return;
    try {
      await restoreComment(forumSlug, postSlug, commentId);
      logActivity(forumSlug, user.uid, profile.username, 'comment_edited', {
        targetType: 'comment',
        targetId: commentId,
        details: 'restored from deleted',
      });
    } catch (err) {
      console.error('[admin:restore-comment] failed:', err);
    }
  }

  async function ban(uid: string, username: string, forumSlug: string) {
    if (!user || !profile) return;
    const reason = promptModerationReason('Ban', username);
    if (!reason) return;
    try {
      await banUser(uid, user.uid, profile.username, reason);
      logActivity(forumSlug, user.uid, profile.username, 'user_timed_out', {
        targetType: 'user',
        targetId: uid,
        details: `${username} (banned)`,
      });
    } catch (err) {
      console.error('[admin:deleted:ban] failed:', err);
    }
  }

  const loading = tab === 'posts' ? posts === null : comments === null;
  const visiblePosts = tab === 'posts' ? filteredPosts : [];
  const visibleComments = tab === 'comments' ? filteredComments : [];
  const empty = tab === 'posts' ? visiblePosts.length === 0 : visibleComments.length === 0;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Deleted content</Text>
      <Text style={styles.sub}>
        Soft-deleted posts and comments across every forum. Restore returns them to the forum.
      </Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setTab('posts')}
          style={[styles.tab, tab === 'posts' && styles.tabActive]}
        >
          <Text style={[styles.tabLabel, tab === 'posts' && styles.tabLabelActive]}>
            Posts ({posts?.length ?? '…'})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('comments')}
          style={[styles.tab, tab === 'comments' && styles.tabActive]}
        >
          <Text style={[styles.tabLabel, tab === 'comments' && styles.tabLabelActive]}>
            Comments ({comments?.length ?? '…'})
          </Text>
        </TouchableOpacity>
      </View>

      <FormInput
        placeholder={
          tab === 'posts'
            ? 'Search title / body / author / forum…'
            : 'Search body / author / forum / post…'
        }
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 24 }} />
      ) : empty ? (
        <Text style={styles.empty}>
          Nothing deleted.
        </Text>
      ) : tab === 'posts' ? (
        visiblePosts.map((p) => (
          <View key={`${p.forumSlug}/${p.id}`} style={styles.card}>
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.meta}>
              by{' '}
              <Text style={styles.username} onPress={() => router.push(`/profile/${p.authorUsername}`)}>
                @{p.authorUsername}
              </Text>{' '}
              in {p.forumSlug} · posted {timeAgo(p.createdAt)}
              {p.deletedAt ? `, deleted ${timeAgo(p.deletedAt)}` : ''}
              {p.deletedByUsername ? ` by @${p.deletedByUsername}` : ''}
            </Text>
            {!!p.body && <Text style={styles.body}>{previewText(p.body, 220)}</Text>}
            <View style={styles.actions}>
              <ActBtn label="View" onPress={() => router.push(`/forums/${p.forumSlug}/${p.id}` as never)} />
              <ActBtn label="Restore" onPress={() => restoreP(p.forumSlug, p.id)} />
              <ActBtn label="Ban author" destructive onPress={() => ban(p.authorUid, p.authorUsername, p.forumSlug)} />
            </View>
          </View>
        ))
      ) : (
        visibleComments.map((c) => (
          <View key={`${c.forumSlug}/${c.postSlug}/${c.id}`} style={styles.card}>
            <Text style={styles.commentBody}>{previewText(c.body ?? '', 280)}</Text>
            <Text style={styles.meta}>
              by{' '}
              <Text style={styles.username} onPress={() => router.push(`/profile/${c.authorUsername}`)}>
                @{c.authorUsername}
              </Text>{' '}
              in {c.forumSlug} on post {c.postSlug} · posted {timeAgo(c.createdAt)}
              {c.deletedAt ? `, deleted ${timeAgo(c.deletedAt)}` : ''}
              {c.deletedByUsername ? ` by @${c.deletedByUsername}` : ''}
            </Text>
            <View style={styles.actions}>
              <ActBtn
                label="View post"
                onPress={() => router.push(`/forums/${c.forumSlug}/${c.postSlug}` as never)}
              />
              <ActBtn label="Restore" onPress={() => restoreC(c.forumSlug, c.postSlug, c.id)} />
              <ActBtn
                label="Ban author"
                destructive
                onPress={() => ban(c.authorUid, c.authorUsername, c.forumSlug)}
              />
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
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  tabLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12, fontWeight: '600' },
  tabLabelActive: { color: '#000' },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginTop: 16 },
  card: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 12, opacity: 0.85 },
  title: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 18, marginBottom: 4 },
  commentBody: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, lineHeight: 20, marginBottom: 6 },
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

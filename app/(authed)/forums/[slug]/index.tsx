import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuth } from '../../../../lib/auth';
import { trackForumVisit } from '../../../../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../../lib/theme';
import { isClosed, popularity, timeRemaining } from '../../../../lib/forum-utils';
import { useIsMod, useIsMutedInForum, useTimeoutStatus } from '../../../../lib/moderation';
import { useIsServerAdmin } from '../../../../lib/admins';
import { ShieldIcon } from '../../../../components/Icons';
import { PostCard, type PostSummary } from '../../../../components/PostCard';
import { PostComposer } from '../../../../components/PostComposer';
import { InfoIcon, PlusIcon } from '../../../../components/Icons';
import { FormInput } from '../../../../components/FormInput';

type Forum = {
  name: string;
  description: string;
  closesAt: Timestamp;
  moderatorUids?: string[];
};

export default function ForumPage() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isMod = useIsMod(slug);
  const isAdmin = useIsServerAdmin();
  const muted = useIsMutedInForum(slug);
  const timeoutState = useTimeoutStatus();
  const compact = width < 768;


  const canOpenModPanel = isMod || isAdmin;

  const [forum, setForum] = useState<Forum | null | undefined>(undefined);
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'popular'>('newest');

  useEffect(() => {
    if (!slug) return;
    return onSnapshot(doc(db, 'forums', slug), (snap) => {
      if (!snap.exists()) setForum(null);
      else setForum(snap.data() as Forum);
    });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const q = query(collection(db, 'forums', slug, 'posts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostSummary, 'id'>) })));
    });
  }, [slug]);

  useEffect(() => {
    if (!user || !slug || !forum) return;
    trackForumVisit(user.uid, slug, forum.name, isClosed(forum.closesAt)).catch((err) => {
      console.warn('[forum:track] failed:', err);
    });
  }, [user, slug, forum]);






  const visiblePosts = useMemo(() => {


    const base = (posts ?? [])
      .filter((p) => !p.isDeleted)
      .filter((p) => isMod || isAdmin || !p.isQuarantined);
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? base
      : base.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.body ?? '').toLowerCase().includes(q) ||
            p.authorUsername.toLowerCase().includes(q),
        );
    return [...filtered].sort((a, b) => {

      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (sort === 'popular') return popularity(b) - popularity(a);
      return (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);
    });
  }, [posts, isMod, isAdmin, search, sort]);

  if (forum === undefined) {
    return <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 32 }} />;
  }
  if (forum === null) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Forum not found.</Text>
      </View>
    );
  }

  const closed = isClosed(forum.closesAt);
  const canPost = !closed && !muted && !timeoutState.timedOut;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Text style={[styles.heading, compact && styles.headingCompact]}>{forum.name}</Text>
          <View style={[styles.timeBadge, closed ? styles.timeBadgeClosed : styles.timeBadgeActive]}>
            <Text style={[styles.timeBadgeText, closed && styles.timeBadgeTextClosed]}>
              {closed ? 'Read-only' : timeRemaining(forum.closesAt)}
            </Text>
          </View>
        </View>
        {!!forum.description && <Text style={styles.description}>{forum.description}</Text>}

        {closed && (
          <View style={styles.banner}>
            <InfoIcon size={20} color={COLORS.yellow} />
            <Text style={styles.bannerText}>
              This forum has closed. You can read posts but not add new ones.
            </Text>
          </View>
        )}

        {timeoutState.timedOut && (
          <View style={[styles.banner, styles.bannerError]}>
            <InfoIcon size={20} color={COLORS.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerText}>
                {timeoutState.expiresAt
                  ? `You're timed out until ${timeoutState.expiresAt.toLocaleString()} and cannot post or comment anywhere.`
                  : `You've been banned and cannot post or comment anywhere.`}
              </Text>
              {timeoutState.reason && (
                <Text style={styles.bannerReason}>Reason: {timeoutState.reason}</Text>
              )}
            </View>
          </View>
        )}

        {muted && !timeoutState.timedOut && (
          <View style={[styles.banner, styles.bannerWarn]}>
            <InfoIcon size={20} color="#ffaa55" />
            <Text style={styles.bannerText}>You've been muted in this forum and can't post or comment here.</Text>
          </View>
        )}

        <View style={styles.controls}>
          <FormInput
            placeholder="Search posts by title, body, or @username…"
            value={search}
            onChangeText={setSearch}
          />
          <View style={[styles.sortRow, compact && styles.sortRowCompact]}>
            <Text style={styles.sortLabel}>Sort:</Text>
            <TouchableOpacity
              onPress={() => setSort('newest')}
              style={[styles.sortChip, sort === 'newest' && styles.sortChipActive]}
            >
              <Text style={[styles.sortChipLabel, sort === 'newest' && styles.sortChipLabelActive]}>
                Newest
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSort('popular')}
              style={[styles.sortChip, sort === 'popular' && styles.sortChipActive]}
            >
              <Text style={[styles.sortChipLabel, sort === 'popular' && styles.sortChipLabelActive]}>
                Popular
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {posts === null ? (
          <ActivityIndicator color={COLORS.yellow} />
        ) : visiblePosts.length === 0 ? (
          <Text style={styles.empty}>
            {search.trim() ? 'No matching posts.' : `No posts yet. ${closed ? '' : 'Be the first.'}`}
          </Text>
        ) : (
          visiblePosts.map((p) => (
            <PostCard
              key={p.id}
              forumSlug={slug!}
              post={p}
              moderatorUids={forum.moderatorUids ?? []}
            />
          ))
        )}
      </ScrollView>

      {canPost && (
        <TouchableOpacity
          style={[styles.fab, compact && styles.fabCompact]}
          onPress={() => setComposerOpen(true)}
          activeOpacity={0.85}
          accessibilityLabel="Create post"
        >
          <PlusIcon size={26} color="#000" />
        </TouchableOpacity>
      )}

      {canOpenModPanel && (
        <TouchableOpacity
          style={[styles.modFab, compact && styles.modFabCompact]}
          onPress={() => router.push(`/forums/${slug}/mod` as never)}
          activeOpacity={0.85}
          accessibilityLabel="Open moderator panel"
        >
          <ShieldIcon size={20} color="#000" />
          <Text style={styles.modFabLabel}>Mod Panel</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={composerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setComposerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <PostComposer
              forumSlug={slug!}
              onPosted={() => setComposerOpen(false)}
              onCancel={() => setComposerOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 32, paddingBottom: 120 },
  scrollCompact: { padding: 16, paddingBottom: 96 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  headerCompact: { alignItems: 'flex-start' },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 28, flexShrink: 1 },
  headingCompact: { fontSize: 24 },
  timeBadge: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timeBadgeActive: { backgroundColor: COLORS.yellow },
  timeBadgeClosed: { backgroundColor: '#3a3a3a' },
  timeBadgeText: { color: '#000', fontFamily: BODY_FONT, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  timeBadgeTextClosed: { color: COLORS.textMuted },
  description: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 14, marginBottom: 24, lineHeight: 20 },

  banner: {
    backgroundColor: '#2a2a2a',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.yellow,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerWarn: { borderLeftColor: '#ffaa55' },
  bannerError: { borderLeftColor: COLORS.error },
  bannerText: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, flex: 1 },
  bannerReason: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4, fontStyle: 'italic' },

  controls: { marginBottom: 16 },


  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  sortRowCompact: { flexWrap: 'wrap', marginTop: 4 },
  sortLabel: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginRight: 4, letterSpacing: 0.5 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.separator,
    backgroundColor: 'transparent',
  },
  sortChipActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  sortChipLabel: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, fontWeight: '700' },
  sortChipLabelActive: { color: '#000' },

  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, textAlign: 'center', marginTop: 24 },
  notFound: { padding: 32 },
  notFoundText: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 14 },

  fab: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  fabCompact: { right: 16, bottom: 20, width: 54, height: 54, borderRadius: 27 },

  modFab: {
    position: 'absolute',
    left: 32,
    bottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  modFabCompact: { left: 16, bottom: 20, paddingHorizontal: 12, paddingVertical: 10 },
  modFabLabel: { color: '#000', fontFamily: BODY_FONT, fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: { width: '100%', maxWidth: 640, maxHeight: '85%' },
});

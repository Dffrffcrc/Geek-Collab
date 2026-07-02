import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { useUserProfile } from '../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { previewText, timeAgo } from '../lib/forum-utils';
import { logActivity, muteUser, setPostQuarantine, timeoutUser, useIsMod } from '../lib/moderation';
import { isAdminUsername, useIsServerAdmin } from '../lib/admins';
import { describeActionError, pinPost, promptModerationReason, unpinPost } from '../lib/admin-tools';
import { Avatar } from './Avatar';
import { HeartIcon, CommentIcon, MoreIcon } from './Icons';
import { OverflowMenu, type MenuAction } from './OverflowMenu';
import { ReportModal } from './ReportModal';
import { EditModal } from './EditModal';
import { UserRoleTags } from './RoleTag';
import type { Timestamp } from 'firebase/firestore';

export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  body: string;
  authorUid: string;
  authorUsername: string;
  authorDisplayName: string;
  createdAt: Timestamp;
  editedAt?: Timestamp | null;
  likeCount: number;
  commentCount: number;
  mediaUrls?: string[];
  isQuarantined?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
};

export function PostCard({
  forumSlug,
  post,
  moderatorUids = [],
}: {
  forumSlug: string;
  post: PostSummary;
  moderatorUids?: string[];
}) {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useUserProfile();
  const isMod = useIsMod(forumSlug);
  const isAdmin = useIsServerAdmin();
  const { width } = useWindowDimensions();
  const isAuthor = !!user && user.uid === post.authorUid;
  const isMobile = width < 640;
  // Admins can moderate any author including other admins. Mods can only
  // moderate non-admins; the author-is-admin check stays for the mod branch.
  const canModerate = isAdmin || (isMod && !isAdminUsername(post.authorUsername));
  const firstImage = post.mediaUrls?.[0];

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [liked, setLiked] = useState(false);

  // Subscribe to the user's like presence on this post so the heart reflects
  // truth across tabs/devices.
  useEffect(() => {
    if (!user) {
      setLiked(false);
      return;
    }
    return onSnapshot(
      doc(db, 'forums', forumSlug, 'posts', post.slug, 'likes', user.uid),
      (snap) => setLiked(snap.exists()),
    );
  }, [user, forumSlug, post.slug]);

  async function toggleLike() {
    if (!user) return;
    const likeRef = doc(db, 'forums', forumSlug, 'posts', post.slug, 'likes', user.uid);
    const postRef = doc(db, 'forums', forumSlug, 'posts', post.slug);
    try {
      if (liked) {
        await deleteDoc(likeRef);
        await runTransaction(db, async (tx) => {
          const p = await tx.get(postRef);
          if (p.exists()) {
            tx.update(postRef, { likeCount: Math.max(0, (p.data().likeCount ?? 1) - 1) });
          }
        });
      } else {
        await setDoc(likeRef, { createdAt: serverTimestamp() });
        await runTransaction(db, async (tx) => {
          tx.update(postRef, { likeCount: increment(1) });
        });
      }
    } catch (err) {
      console.error('[post-card:like] failed:', err);
    }
  }

  async function deletePost() {
    if (post.isDeleted) return;
    if (!confirm('Delete this post?')) return;
    if (!user || !profile) return;
    try {
      // Soft delete — keeps content for admin audit, hides from normal views.
      await updateDoc(doc(db, 'forums', forumSlug, 'posts', post.slug), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user.uid,
        deletedByUsername: profile.username,
      });
      logActivity(forumSlug, user.uid, profile.username, 'post_deleted', {
        targetType: 'post',
        targetId: post.slug,
        details: post.title,
      });
    } catch (err) {
      console.error('[post:delete] failed:', err);
      alert(describeActionError('delete post', err));
    }
  }

  function reportFailure(scope: string, err: unknown) {
    console.error(`[post:${scope}] failed:`, err);
    alert(describeActionError(scope, err));
  }

  async function togglePin() {
    if (!user || !profile) return;
    try {
      const next = !post.isPinned;
      if (next) {
        await pinPost(forumSlug, post.slug);
      } else {
        await unpinPost(forumSlug, post.slug);
      }
      logActivity(forumSlug, user.uid, profile.username, next ? 'post_pinned' : 'post_unpinned', {
        targetType: 'post',
        targetId: post.slug,
        details: post.title,
      });
    } catch (err) {
      reportFailure('pin post', err);
    }
  }

  async function toggleQuarantine() {
    try {
      const next = !post.isQuarantined;
      await setPostQuarantine(forumSlug, post.slug, next);
      if (user && profile) {
        logActivity(forumSlug, user.uid, profile.username, next ? 'post_quarantined' : 'post_unquarantined', {
          targetType: 'post',
          targetId: post.slug,
        });
      }
    } catch (err) {
      reportFailure('quarantine', err);
    }
  }

  async function muteAuthor() {
    if (!user || !profile) return;
    if (!confirm(`Mute @${post.authorUsername} in this forum?`)) return;
    try {
      await muteUser(forumSlug, post.authorUid, user.uid);
      logActivity(forumSlug, user.uid, profile.username, 'user_muted', {
        targetType: 'user',
        targetId: post.authorUid,
        details: post.authorUsername,
      });
    } catch (err) {
      reportFailure('mute-author', err);
    }
  }

  async function timeoutAuthor() {
    if (!user || !profile) return;
    const reason = promptModerationReason('Timeout', post.authorUsername);
    if (!reason) return;
    try {
      await timeoutUser(post.authorUid, user.uid, profile.username, reason);
      logActivity(forumSlug, user.uid, profile.username, 'user_timed_out', {
        targetType: 'user',
        targetId: post.authorUid,
        details: post.authorUsername,
      });
    } catch (err) {
      reportFailure('timeout-author', err);
    }
  }

  const actions: MenuAction[] = [];
  if (isAuthor && !post.isDeleted) actions.push({ label: 'Edit', onPress: () => setEditOpen(true) });
  if ((isAuthor || canModerate) && !post.isDeleted) {
    actions.push({ label: 'Delete', destructive: true, onPress: deletePost });
  }
  if (isAdmin) {
    actions.push({ label: post.isPinned ? 'Unpin post' : 'Pin post', onPress: togglePin });
  }
  if (canModerate) {
    actions.push({
      label: post.isQuarantined ? 'Remove from quarantine' : 'Move to quarantine',
      onPress: toggleQuarantine,
    });
    actions.push({ label: `Mute @${post.authorUsername}`, onPress: muteAuthor });
    actions.push({ label: `Timeout @${post.authorUsername}`, destructive: true, onPress: timeoutAuthor });
  }
  if (!isAuthor) actions.push({ label: 'Report', onPress: () => setReportOpen(true) });

  return (
    <>
      <TouchableOpacity
        style={[styles.card, isMobile && styles.cardMobile, post.isQuarantined && styles.quarantined]}
        activeOpacity={0.85}
        onPress={() => router.push(`/forums/${forumSlug}/${post.slug}`)}
      >
        <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
          <View style={styles.headerLeft}>
            <Avatar size={32} label={post.authorDisplayName || post.authorUsername} />
            <View style={{ marginLeft: 10, flex: 1, minWidth: 0 }}>
              <View style={styles.usernameRow}>
                <Text
                  style={styles.displayName}
                  onPress={() => router.push(`/profile/${post.authorUsername}`)}
                >
                  {post.authorDisplayName || post.authorUsername}
                </Text>
                <Text
                  style={styles.handle}
                  onPress={() => router.push(`/profile/${post.authorUsername}`)}
                >
                  @{post.authorUsername}
                </Text>
                <UserRoleTags
                  username={post.authorUsername}
                  uid={post.authorUid}
                  moderatorUids={moderatorUids}
                />
              </View>
              <Text style={styles.timestamp}>
                {timeAgo(post.createdAt)}
                {post.editedAt ? ' · edited' : ''}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {post.isPinned && (
              <Text style={styles.pinnedTag}>PINNED</Text>
            )}
            {post.isQuarantined && (
              <Text style={styles.quarantineTag}>QUARANTINED</Text>
            )}
            {actions.length > 0 && (
              <TouchableOpacity
                onPress={() => setMenuOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.moreBtn}
              >
                <MoreIcon size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={[styles.title, isMobile && styles.titleMobile]}>{post.title}</Text>
        {!!post.body && <Text style={[styles.body, isMobile && styles.bodyMobile]}>{previewText(post.body)}</Text>}

        {firstImage && (
          <View style={styles.thumbWrap}>
            <Image source={{ uri: firstImage }} style={styles.thumb} resizeMode="cover" />
            {(post.mediaUrls?.length ?? 0) > 1 && (
              <View style={styles.thumbCount}>
                <Text style={styles.thumbCountText}>+{(post.mediaUrls?.length ?? 0) - 1}</Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.footer, isMobile && styles.footerMobile]}>
          <TouchableOpacity
            style={[styles.iconRow, liked && styles.iconRowActive]}
            onPress={toggleLike}
            activeOpacity={0.7}
            accessibilityLabel={liked ? 'Unlike post' : 'Like post'}
          >
            <HeartIcon
              size={16}
              color={liked ? COLORS.yellow : COLORS.textMuted}
              filled={liked}
            />
            <Text style={[styles.count, liked && styles.countActive]}>{post.likeCount ?? 0}</Text>
          </TouchableOpacity>
          <View style={styles.iconRow}>
            <CommentIcon size={15} color={COLORS.textMuted} />
            <Text style={styles.count}>{post.commentCount ?? 0}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <OverflowMenu visible={menuOpen} onClose={() => setMenuOpen(false)} actions={actions} />
      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        forumSlug={forumSlug}
        targetType="post"
        targetId={post.slug}
        targetAuthorUid={post.authorUid}
        targetAuthorUsername={post.authorUsername}
      />
      <EditModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        forumSlug={forumSlug}
        kind="post"
        postSlug={post.slug}
        initialTitle={post.title}
        initialBody={post.body}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  cardMobile: { padding: 14, borderRadius: 12, marginBottom: 12 },
  quarantined: { borderWidth: 1, borderColor: COLORS.warnBorder },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerRowMobile: { alignItems: 'flex-start' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  usernameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  displayName: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, fontWeight: '700' },
  handle: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12 },
  timestamp: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11 },
  pinnedTag: {
    backgroundColor: '#2a2500',
    color: COLORS.yellow,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.yellow,
    fontFamily: BODY_FONT,
    fontWeight: '700',
    letterSpacing: 0.5,
    overflow: 'hidden',
  },
  quarantineTag: {
    backgroundColor: COLORS.warnBg,
    color: COLORS.warn,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.warnBorder,
    fontFamily: BODY_FONT,
    fontWeight: '700',
    letterSpacing: 0.5,
    overflow: 'hidden',
  },
  moreBtn: { padding: 4 },
  title: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 22, marginBottom: 8 },
  titleMobile: { fontSize: 18, marginBottom: 6 },
  body: { color: '#cccccc', fontFamily: BODY_FONT, fontSize: 14, lineHeight: 20 },
  bodyMobile: { fontSize: 13, lineHeight: 18 },
  thumbWrap: { marginTop: 12, position: 'relative', borderRadius: 10, overflow: 'hidden' },
  thumb: { width: '100%', height: 200, backgroundColor: '#1f1f1f' },
  thumbCount: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  thumbCountText: { color: '#fff', fontFamily: BODY_FONT, fontSize: 11, fontWeight: '700' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 14 },
  footerMobile: { flexWrap: 'wrap', gap: 8, marginTop: 12 },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f1f1f',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconRowActive: { borderColor: COLORS.yellow },
  count: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12 },
  countActive: { color: COLORS.yellow, fontWeight: '700' },
});

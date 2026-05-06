import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { useUserProfile } from '../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { previewText, timeAgo } from '../lib/forum-utils';
import { logActivity, useIsMod, setPostQuarantine } from '../lib/moderation';
import { Avatar } from './Avatar';
import { HeartIcon, CommentIcon, MoreIcon } from './Icons';
import { OverflowMenu, type MenuAction } from './OverflowMenu';
import { ReportModal } from './ReportModal';
import { EditModal } from './EditModal';
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
};

export function PostCard({
  forumSlug,
  post,
}: {
  forumSlug: string;
  post: PostSummary;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useUserProfile();
  const isMod = useIsMod(forumSlug);
  const isAuthor = !!user && user.uid === post.authorUid;
  const firstImage = post.mediaUrls?.[0];

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function deletePost() {
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
      console.error('[post:quarantine] failed:', err);
    }
  }

  const actions: MenuAction[] = [];
  if (isAuthor) actions.push({ label: 'Edit', onPress: () => setEditOpen(true) });
  if (isAuthor || isMod) actions.push({ label: 'Delete', destructive: true, onPress: deletePost });
  if (isMod) {
    actions.push({
      label: post.isQuarantined ? 'Remove from quarantine' : 'Move to quarantine',
      onPress: toggleQuarantine,
    });
  }
  if (!isAuthor) actions.push({ label: 'Report', onPress: () => setReportOpen(true) });

  return (
    <>
      <TouchableOpacity
        style={[styles.card, post.isQuarantined && styles.quarantined]}
        activeOpacity={0.85}
        onPress={() => router.push(`/forums/${forumSlug}/${post.slug}`)}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Avatar size={32} label={post.authorDisplayName || post.authorUsername} />
            <View style={{ marginLeft: 10 }}>
              <Text
                style={styles.username}
                onPress={() => router.push(`/user/${post.authorUsername}`)}
              >
                {post.authorUsername}
              </Text>
              <Text style={styles.timestamp}>
                {timeAgo(post.createdAt)}
                {post.editedAt ? ' · edited' : ''}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
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

        <Text style={styles.title}>{post.title}</Text>
        {!!post.body && <Text style={styles.body}>{previewText(post.body)}</Text>}

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

        <View style={styles.footer}>
          <View style={styles.iconRow}>
            <HeartIcon size={16} color={COLORS.yellow} filled />
            <Text style={styles.count}>{post.likeCount ?? 0}</Text>
          </View>
          <View style={styles.iconRow}>
            <CommentIcon size={15} color={COLORS.yellow} />
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
  quarantined: { borderWidth: 1, borderColor: '#7a4a4a' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  username: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 13, fontWeight: '700' },
  timestamp: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11 },
  quarantineTag: {
    backgroundColor: 'rgba(255,118,118,0.18)',
    color: COLORS.error,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: BODY_FONT,
    fontWeight: '700',
    letterSpacing: 0.5,
    overflow: 'hidden',
  },
  moreBtn: { padding: 4 },
  title: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 22, marginBottom: 8 },
  body: { color: '#cccccc', fontFamily: BODY_FONT, fontSize: 14, lineHeight: 20 },
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
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f1f1f',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  count: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
});

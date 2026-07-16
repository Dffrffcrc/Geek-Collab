import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuth } from '../../../../lib/auth';
import { useUserProfile } from '../../../../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../../lib/theme';
import { isClosed, timeAgo } from '../../../../lib/forum-utils';
import {
  logActivity,
  muteUser,
  trackParticipant,
  setPostQuarantine,
  timeoutUser,
  useIsMod,
  useIsMutedInForum,
  useTimeoutStatus,
} from '../../../../lib/moderation';
import { isAdminUsername, useIsServerAdmin } from '../../../../lib/admins';
import { UserRoleTags } from '../../../../components/RoleTag';
import { describeActionError, promptModerationReason, violatesContentFilter } from '../../../../lib/admin-tools';
import { Avatar } from '../../../../components/Avatar';
import { MarkdownBody } from '../../../../components/MarkdownBody';
import { FormInput } from '../../../../components/FormInput';
import { CommentItem, type Comment } from '../../../../components/CommentItem';
import { HeartIcon, CommentIcon, MoreIcon } from '../../../../components/Icons';
import { OverflowMenu, type MenuAction } from '../../../../components/OverflowMenu';
import { ReportModal } from '../../../../components/ReportModal';
import { EditModal } from '../../../../components/EditModal';
import { PostAttachments } from '../../../../components/PostAttachments';
import { AttachmentPicker, type AttachmentPickerHandle } from '../../../../components/AttachmentPicker';
import { DropZone } from '../../../../components/DropZone';
import { deleteAttachment, type Attachment } from '../../../../lib/uploads';

type Post = {
  title: string;
  slug: string;
  body: string;
  authorUid: string;
  authorUsername: string;
  authorDisplayName: string;
  createdAt: Timestamp;
  editedAt?: Timestamp | null;
  likeCount: number;
  commentCount: number;
  mediaUrls?: string[];
  attachments?: Attachment[];
  isQuarantined?: boolean;
  isDeleted?: boolean;
  deletedByUsername?: string;
};

type Forum = { name: string; closesAt: Timestamp; moderatorUids?: string[] };

export default function PostDetail() {
  const router = useRouter();
  const { slug, post: postSlug } = useLocalSearchParams<{ slug: string; post: string }>();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const profile = useUserProfile();
  const isMod = useIsMod(slug);
  const isAdmin = useIsServerAdmin();
  const muted = useIsMutedInForum(slug);
  const timeoutState = useTimeoutStatus();
  const { timedOut } = timeoutState;
  const compact = width < 768;

  const [forum, setForum] = useState<Forum | null | undefined>(undefined);
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const commentPickerRef = useRef<AttachmentPickerHandle>(null);
  // Comment sort — persisted per-user in localStorage so the choice sticks
  // across posts and reloads. `oldest` (chronological) is the historical
  // default so unchanged users see the same ordering they always had.
  const [commentSort, setCommentSort] = useState<'oldest' | 'newest' | 'popular'>(() => {
    if (typeof window === 'undefined') return 'oldest';
    const stored = window.localStorage.getItem('geekcollab.commentSort');
    return stored === 'newest' || stored === 'popular' ? stored : 'oldest';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('geekcollab.commentSort', commentSort);
  }, [commentSort]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    return onSnapshot(doc(db, 'forums', slug), (snap) => {
      setForum(snap.exists() ? (snap.data() as Forum) : null);
    });
  }, [slug]);

  useEffect(() => {
    if (!slug || !postSlug) return;
    return onSnapshot(doc(db, 'forums', slug, 'posts', postSlug), (snap) => {
      setPost(snap.exists() ? (snap.data() as Post) : null);
    });
  }, [slug, postSlug]);

  useEffect(() => {
    if (!slug || !postSlug) return;
    const q = query(
      collection(db, 'forums', slug, 'posts', postSlug, 'comments'),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Comment, 'id'>) })));
    });
  }, [slug, postSlug]);

  useEffect(() => {
    if (!user || !slug || !postSlug) return;
    return onSnapshot(doc(db, 'forums', slug, 'posts', postSlug, 'likes', user.uid), (snap) => {
      setLiked(snap.exists());
    });
  }, [user, slug, postSlug]);

  async function toggleLike() {
    if (!user || !slug || !postSlug) return;
    const likeRef = doc(db, 'forums', slug, 'posts', postSlug, 'likes', user.uid);
    const postRef = doc(db, 'forums', slug, 'posts', postSlug);
    try {
      if (liked) {
        await deleteDoc(likeRef);
        await runTransaction(db, async (tx) => {
          const p = await tx.get(postRef);
          if (p.exists()) tx.update(postRef, { likeCount: Math.max(0, (p.data().likeCount ?? 1) - 1) });
        });
      } else {
        await setDoc(likeRef, { createdAt: serverTimestamp() });
        await runTransaction(db, async (tx) => {
          tx.update(postRef, { likeCount: increment(1) });
        });
      }
    } catch (err) {
      console.error('[post:like] failed:', err);
    }
  }

  async function postComment() {
    setError(null);
    const t = commentText.trim();
    if (!t && commentAttachments.length === 0) return;
    if (!user || !profile || !slug || !postSlug) return;
    if (timedOut) return setError('You are timed out and cannot comment.');
    if (muted) return setError('You are muted in this forum.');
    const blocked = violatesContentFilter(t);
    if (blocked) {
      return setError(`Your comment contains a restricted word ("${blocked}"). Please rewrite.`);
    }
    setBusy(true);
    try {
      const commentsRef = collection(db, 'forums', slug, 'posts', postSlug, 'comments');
      const postRef = doc(db, 'forums', slug, 'posts', postSlug);
      const commentRef = await addDoc(commentsRef, {
        body: t,
        authorUid: user.uid,
        authorUsername: profile.username,
        authorDisplayName: profile.displayName,
        createdAt: serverTimestamp(),
        parentCommentId: null,
        rootCommentId: null,
        isDeleted: false,
        attachments: commentAttachments,
      });
      await runTransaction(db, async (tx) => {
        const updates: Record<string, unknown> = { commentCount: increment(1) };
        // Only count toward popularity if a non-author commented.
        if (post && user.uid !== post.authorUid) {
          updates.nonAuthorCommentCount = increment(1);
        }
        tx.update(postRef, updates);
      });
      trackParticipant(slug, user.uid, profile.username, profile.displayName, 'comment');
      logActivity(slug, user.uid, profile.username, 'comment_created', {
        targetType: 'comment',
        targetId: commentRef.id,
      });
      setCommentText('');
      setCommentAttachments([]);
    } catch (err: unknown) {
      console.error('[comment:create] failed:', err);
      const e = err as { code?: string; message?: string };
      setError(`Could not comment (${e.code ?? e.message ?? 'unknown error'}).`);
    } finally {
      setBusy(false);
    }
  }

  async function deletePost() {
    if (!post || !slug || !postSlug || !user || !profile) return;
    if (post.isDeleted) return;
    if (!confirm('Delete this post?')) return;
    try {
      // Soft delete — admins can still see and restore.
      await updateDoc(doc(db, 'forums', slug, 'posts', postSlug), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user.uid,
        deletedByUsername: profile.username,
      });
      logActivity(slug, user.uid, profile.username, 'post_deleted', {
        targetType: 'post',
        targetId: postSlug,
        details: post.title,
      });
      router.replace(`/forums/${slug}`);
    } catch (err) {
      console.error('[post:delete] failed:', err);
      alert(describeActionError('delete post', err));
    }
  }

  function reportFailure(scope: string, err: unknown) {
    console.error(`[post:${scope}] failed:`, err);
    alert(describeActionError(scope, err));
  }

  async function toggleQuarantine() {
    if (!post || !slug || !postSlug || !user || !profile) return;
    try {
      const next = !post.isQuarantined;
      await setPostQuarantine(slug, postSlug, next);
      logActivity(slug, user.uid, profile.username, next ? 'post_quarantined' : 'post_unquarantined', {
        targetType: 'post',
        targetId: postSlug,
      });
    } catch (err) {
      reportFailure('quarantine', err);
    }
  }

  async function muteAuthor() {
    if (!post || !slug || !user || !profile) return;
    if (!confirm(`Mute @${post.authorUsername} in this forum?`)) return;
    try {
      await muteUser(slug, post.authorUid, user.uid);
      logActivity(slug, user.uid, profile.username, 'user_muted', {
        targetType: 'user',
        targetId: post.authorUid,
        details: post.authorUsername,
      });
    } catch (err) {
      reportFailure('mute-author', err);
    }
  }

  async function timeoutAuthor() {
    if (!post || !slug || !user || !profile) return;
    const reason = promptModerationReason('Timeout', post.authorUsername);
    if (!reason) return;
    try {
      await timeoutUser(post.authorUid, user.uid, profile.username, reason);
      logActivity(slug, user.uid, profile.username, 'user_timed_out', {
        targetType: 'user',
        targetId: post.authorUid,
        details: post.authorUsername,
      });
    } catch (err) {
      reportFailure('timeout-author', err);
    }
  }

  if (post === undefined || forum === undefined) {
    return <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 32 }} />;
  }
  if (post === null || forum === null) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Post not found.</Text>
        <TouchableOpacity onPress={() => router.replace(`/forums/${slug}`)}>
          <Text style={styles.backLink}>← Back to forum</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const closed = isClosed(forum.closesAt);
  const isAuthor = !!user && user.uid === post.authorUid;

  // Block the post detail entirely for non-mods if it's quarantined.
  if (post.isQuarantined && !isMod && !isAdmin) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>This post is under review and not currently visible.</Text>
        <TouchableOpacity onPress={() => router.replace(`/forums/${slug}`)}>
          <Text style={styles.backLink}>← Back to forum</Text>
        </TouchableOpacity>
      </View>
    );
  }
  // Same for soft-deleted posts: invisible except to mods/admins for audit.
  if (post.isDeleted && !isMod && !isAdmin) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>This post has been deleted.</Text>
        <TouchableOpacity onPress={() => router.replace(`/forums/${slug}`)}>
          <Text style={styles.backLink}>← Back to forum</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Admins can moderate any author (including other admins). Mods keep
  // the no-acting-on-admins guard.
  const canModerate = isAdmin || (isMod && !isAdminUsername(post.authorUsername));
  const actions: MenuAction[] = [];
  if (isAuthor && !post.isDeleted) actions.push({ label: 'Edit', onPress: () => setEditOpen(true) });
  if ((isAuthor || canModerate) && !post.isDeleted) {
    actions.push({ label: 'Delete', destructive: true, onPress: deletePost });
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
    <ScrollView contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}>
      <TouchableOpacity onPress={() => router.push(`/forums/${slug}`)}>
        <Text style={styles.crumb}>← {forum.name}</Text>
      </TouchableOpacity>

      <View style={[styles.postCard, compact && styles.postCardCompact]}>
        <View style={[styles.postHeaderRow, compact && styles.postHeaderRowCompact]}>
          <View style={styles.postHeader}>
            <Avatar size={36} label={post.authorDisplayName || post.authorUsername} />
            <View style={{ marginLeft: 10, flex: 1, minWidth: 0 }}>
              <View style={styles.authorRow}>
                <Text
                  style={styles.author}
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
                  moderatorUids={forum.moderatorUids ?? []}
                />
              </View>
              <Text style={styles.timestamp}>
                {timeAgo(post.createdAt)}
                {post.editedAt ? ' · edited' : ''}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {post.isQuarantined && <Text style={styles.quarantineTag}>QUARANTINED</Text>}
            {post.isDeleted && <Text style={styles.deletedTag}>DELETED</Text>}
            {actions.length > 0 && (
              <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.moreBtn}>
                <MoreIcon size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={[styles.title, compact && styles.titleCompact]}>{post.title}</Text>
        {!!post.body && (
          <View style={styles.bodyBox}>
            <MarkdownBody>{post.body}</MarkdownBody>
          </View>
        )}

        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <View style={styles.mediaList}>
            {post.mediaUrls.map((url) => (
              <Image
                key={url}
                source={{ uri: url }}
                style={styles.mediaImg}
                resizeMode="contain"
              />
            ))}
          </View>
        )}

        <PostAttachments attachments={post.attachments} body={post.body} mode="post" />


        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.likeButton, liked && styles.likeButtonActive]}
            onPress={toggleLike}
          >
            <HeartIcon size={18} color={liked ? COLORS.yellow : COLORS.textMuted} filled={liked} />
            <Text style={styles.likeCount}>{post.likeCount ?? 0}</Text>
          </TouchableOpacity>
          <View style={styles.commentBadge}>
            <CommentIcon size={16} color={COLORS.yellow} />
            <Text style={styles.likeCount}>{post.commentCount ?? 0}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.commentsHeading}>Comments</Text>

      {closed ? (
        <Text style={styles.roHint}>Comments are closed.</Text>
      ) : muted ? (
        <Text style={styles.roHint}>You are muted in this forum and cannot comment.</Text>
      ) : timedOut ? (
        <Text style={styles.roHint}>
          {timeoutState.expiresAt
            ? `You are timed out until ${timeoutState.expiresAt.toLocaleString()} and cannot comment.`
            : 'You have been banned and cannot comment.'}
          {timeoutState.reason ? `\nReason: ${timeoutState.reason}` : ''}
        </Text>
      ) : (
        <View style={[styles.commentBox, compact && styles.commentBoxCompact]}>
          <DropZone onFiles={(files) => commentPickerRef.current?.addFiles(files)}>
            <FormInput
              placeholder="Write a comment… (paste or drop images here too)"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              style={{ height: 70, paddingTop: 12 }}
            />
            <Text style={styles.markdownHint}>Markdown supported.</Text>
            <AttachmentPicker
              ref={commentPickerRef}
              attachments={commentAttachments}
              onChange={setCommentAttachments}
              disabled={busy}
            />
          </DropZone>
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.commentSubmit} onPress={postComment} disabled={busy}>
            {busy ? <ActivityIndicator color="#000" /> : <Text style={styles.commentSubmitLabel}>Comment</Text>}
          </TouchableOpacity>
        </View>
      )}

      {(comments?.length ?? 0) > 0 && (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          {(['oldest', 'newest', 'popular'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setCommentSort(mode)}
              style={[styles.sortChip, commentSort === mode && styles.sortChipActive]}
            >
              <Text
                style={[
                  styles.sortChipLabel,
                  commentSort === mode && styles.sortChipLabelActive,
                ]}
              >
                {mode === 'oldest' ? 'Oldest' : mode === 'newest' ? 'Newest' : 'Popular'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {comments === null ? (
        <ActivityIndicator color={COLORS.yellow} style={styles.commentsLoading} />
      ) : comments.length === 0 ? (
        <Text style={styles.empty}>No comments yet.</Text>
      ) : (
        (() => {
          // Build a parent→children map so CommentItem can render the tree
          // recursively. Soft-deleted comments stay visible to per-forum
          // mods (they need an audit view inside the thread). Admins
          // intentionally do NOT see them here — they're meant to use the
          // dedicated deleted view, and the previous behavior made it look
          // like "delete didn't work" because the comment kept appearing
          // tagged DELETED. Note the admin exclusion still applies even
          // when the admin happens to also be in the forum's moderatorUids.
          const visible = comments.filter((c) => !c.isDeleted || (isMod && !isAdmin));
          const map = new Map<string | null, Comment[]>();
          for (const c of visible) {
            const k = c.parentCommentId ?? null;
            const list = map.get(k) ?? [];
            list.push(c);
            map.set(k, list);
          }
          // Nested replies always render chronologically inside their thread
          // (a reply that turned up later shouldn't jump above the message it
          // replies to). Only the top-level list respects the sort choice.
          for (const [, list] of map) {
            list.sort(
              (a, b) =>
                (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0),
            );
          }
          const topLevel = [...(map.get(null) ?? [])];
          if (commentSort === 'newest') {
            topLevel.reverse();
          } else if (commentSort === 'popular') {
            // "Popular" = most direct-or-deep replies. Sum descendants for
            // each top-level comment by walking the map. Non-author replies
            // aren't specially weighted — replies are replies.
            const countDescendants = (id: string): number => {
              const kids = map.get(id) ?? [];
              return kids.length + kids.reduce((s, k) => s + countDescendants(k.id), 0);
            };
            topLevel.sort((a, b) => countDescendants(b.id) - countDescendants(a.id));
          }
          return topLevel.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              forumSlug={slug!}
              postSlug={postSlug!}
              postAuthorUid={post.authorUid}
              moderatorUids={forum.moderatorUids ?? []}
              childrenByParent={map}
              depth={0}
              canReply={!closed && !muted && !timedOut}
            />
          ));
        })()
      )}

      <OverflowMenu visible={menuOpen} onClose={() => setMenuOpen(false)} actions={actions} />
      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        forumSlug={slug!}
        targetType="post"
        targetId={postSlug!}
        targetAuthorUid={post.authorUid}
        targetAuthorUsername={post.authorUsername}
      />
      <EditModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        forumSlug={slug!}
        kind="post"
        postSlug={postSlug!}
        initialTitle={post.title}
        initialBody={post.body}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64, maxWidth: 800 },
  scrollCompact: { padding: 16, paddingBottom: 36 },
  crumb: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 16 },
  postCard: { backgroundColor: '#2a2a2a', borderRadius: 14, padding: 22, marginBottom: 24 },
  postCardCompact: { padding: 16, borderRadius: 12, marginBottom: 18 },
  postHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  postHeaderRowCompact: { alignItems: 'flex-start' },
  postHeader: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  authorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  author: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 15, fontWeight: '700' },
  handle: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12 },
  timestamp: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12 },
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
  deletedTag: {
    backgroundColor: '#3a3a3a',
    color: COLORS.textMuted,
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
  title: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 26, marginBottom: 12 },
  titleCompact: { fontSize: 22, marginBottom: 10 },
  bodyBox: { marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f1f1f',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  likeButtonActive: { backgroundColor: '#3a3300' },
  likeCount: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13 },
  commentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f1f1f',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  mediaList: { gap: 12, marginTop: 16 },
  mediaImg: { width: '100%', height: 360, borderRadius: 10, backgroundColor: '#1a1a1a' },
  commentsHeading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18, marginBottom: 14 },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 16, marginTop: 16 },
  commentBox: { marginTop: 8, marginBottom: 24 },
  commentBoxCompact: { marginTop: 4, marginBottom: 20 },
  commentsLoading: { marginTop: 24 },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  sortLabel: {
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    fontSize: 11,
    marginRight: 4,
    letterSpacing: 0.5,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.separator,
    backgroundColor: 'transparent',
  },
  sortChipActive: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  sortChipLabel: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, fontWeight: '700' },
  sortChipLabelActive: { color: '#000' },
  markdownHint: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginTop: 4, marginBottom: 4 },
  commentSubmit: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
  },
  commentSubmitLabel: { color: '#000', fontFamily: BODY_FONT, fontWeight: '700', fontSize: 13 },
  error: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 12, marginBottom: 6 },
  roHint: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, textAlign: 'center', marginTop: 12 },
  notFound: { padding: 32 },
  notFoundText: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 16, marginBottom: 12 },
  backLink: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 13 },
});

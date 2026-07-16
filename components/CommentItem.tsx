import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { useUserProfile } from '../lib/user-profile';
import { COLORS, BODY_FONT } from '../lib/theme';
import { timeAgo } from '../lib/forum-utils';
import { logActivity, muteUser, timeoutUser, trackParticipant, useIsMod } from '../lib/moderation';
import { isAdminUsername, useIsServerAdmin } from '../lib/admins';
import { describeActionError, promptModerationReason, violatesContentFilter } from '../lib/admin-tools';
import { Avatar } from './Avatar';
import { MarkdownBody } from './MarkdownBody';
import { MoreIcon } from './Icons';
import { OverflowMenu, type MenuAction } from './OverflowMenu';
import { ReportModal } from './ReportModal';
import { EditModal } from './EditModal';
import { UserRoleTags } from './RoleTag';
import { PostAttachments } from './PostAttachments';
import { InlineComposer } from './InlineComposer';
import { deleteAttachment, type Attachment } from '../lib/uploads';
import type { Timestamp } from 'firebase/firestore';

export type Comment = {
  id: string;
  authorUid: string;
  authorUsername: string;
  authorDisplayName: string;
  body: string;
  createdAt: Timestamp;
  editedAt?: Timestamp | null;
  parentCommentId?: string | null;
  rootCommentId?: string | null;
  attachments?: Attachment[];
  isDeleted?: boolean;
  deletedAt?: Timestamp | null;
  deletedByUsername?: string;
};

// Cap visual indent at this depth so deep threads stay readable on narrow
// screens. Past the cap the tree still grows logically but visually the
// indent stops nesting deeper.
const INDENT_CAP = 5;

export function CommentItem({
  comment,
  forumSlug,
  postSlug,
  postAuthorUid,
  moderatorUids = [],
  childrenByParent,
  depth = 0,
  canReply = true,
}: {
  comment: Comment;
  forumSlug: string;
  postSlug: string;
  postAuthorUid: string;
  moderatorUids?: string[];
  childrenByParent?: Map<string | null, Comment[]>;
  depth?: number;
  canReply?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useUserProfile();
  const isMod = useIsMod(forumSlug);
  const isAdmin = useIsServerAdmin();
  const { width } = useWindowDimensions();
  const isAuthor = !!user && user.uid === comment.authorUid;
  const isPostAuthor = comment.authorUid === postAuthorUid;
  const isMobile = width < 640;
  // Admins can moderate every author including other admins. Mods retain
  // the original "no acting on admins" guard.
  const canModerate = isAdmin || (isMod && !isAdminUsername(comment.authorUsername));

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([]);
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Direct children of this comment (one level down). Sorted oldest-first so
  // a stable conversation order stays as new replies arrive.
  const children = childrenByParent?.get(comment.id) ?? [];
  // Default-collapsed beyond the top level so deep threads don't dominate
  // the page on first paint. Top-level shows its replies by default.
  const [repliesOpen, setRepliesOpen] = useState(depth === 0);

  const isReply = depth > 0;
  const atIndentCap = depth >= INDENT_CAP;

  function openReply() {
    setReplyError(null);
    // Pre-fill an @mention so the recipient is obvious even as nesting gets
    // deep and indent visually compresses.
    setReplyText(`@${comment.authorUsername} `);
    setReplyOpen(true);
  }

  async function submitReply() {
    setReplyError(null);
    const t = replyText.trim();
    if (!t && replyAttachments.length === 0) return;
    if (!user || !profile) return setReplyError('You must be signed in.');
    const blocked = violatesContentFilter(t);
    if (blocked) {
      return setReplyError(`Restricted word ("${blocked}") detected. Please rewrite.`);
    }
    setReplyBusy(true);
    try {
      const root = comment.parentCommentId ? comment.rootCommentId ?? comment.id : comment.id;
      await addDoc(collection(db, 'forums', forumSlug, 'posts', postSlug, 'comments'), {
        body: t,
        authorUid: user.uid,
        authorUsername: profile.username,
        authorDisplayName: profile.displayName,
        createdAt: serverTimestamp(),
        parentCommentId: comment.id,
        rootCommentId: root,
        isDeleted: false,
        attachments: replyAttachments,
      });
      // Counter bumps. Best-effort: counter drift is acceptable, content is what matters.
      try {
        await runTransaction(db, async (tx) => {
          const updates: Record<string, unknown> = { commentCount: increment(1) };
          if (user.uid !== postAuthorUid) updates.nonAuthorCommentCount = increment(1);
          tx.update(doc(db, 'forums', forumSlug, 'posts', postSlug), updates);
        });
      } catch {
        /* ignore counter failure */
      }
      trackParticipant(forumSlug, user.uid, profile.username, profile.displayName, 'comment');
      logActivity(forumSlug, user.uid, profile.username, 'comment_created', {
        targetType: 'comment',
        targetId: comment.id,
        details: 'reply',
      });
      setReplyOpen(false);
      setReplyText('');
      setReplyAttachments([]);
    } catch (err: unknown) {
      console.error('[reply:create] failed:', err);
      const e = err as { code?: string; message?: string };
      setReplyError(`Could not reply (${e.code ?? e.message ?? 'unknown error'}).`);
    } finally {
      setReplyBusy(false);
    }
  }

  async function deleteComment() {
    // Guard against re-running on an already-deleted comment, which would
    // otherwise double-decrement commentCount and push it negative.
    if (comment.isDeleted) return;
    if (!confirm('Delete this comment?')) return;
    if (!user || !profile) return;
    try {
      // Soft delete — admin can still view this for audit.
      await updateDoc(doc(db, 'forums', forumSlug, 'posts', postSlug, 'comments', comment.id), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user.uid,
        deletedByUsername: profile.username,
      });
      try {
        await runTransaction(db, async (tx) => {
          tx.update(doc(db, 'forums', forumSlug, 'posts', postSlug), {
            commentCount: increment(-1),
          });
        });
      } catch {
        /* counter drift is acceptable */
      }
      logActivity(forumSlug, user.uid, profile.username, 'comment_deleted', {
        targetType: 'comment',
        targetId: comment.id,
      });
    } catch (err) {
      console.error('[comment:delete] failed:', err);
      alert(describeActionError('delete comment', err));
    }
  }

  function reportFailure(scope: string, err: unknown) {
    console.error(`[comment:${scope}] failed:`, err);
    alert(describeActionError(scope, err));
  }

  async function muteAuthor() {
    if (!user || !profile) return;
    if (!confirm(`Mute @${comment.authorUsername} in this forum?`)) return;
    try {
      await muteUser(forumSlug, comment.authorUid, user.uid);
      logActivity(forumSlug, user.uid, profile.username, 'user_muted', {
        targetType: 'user',
        targetId: comment.authorUid,
        details: comment.authorUsername,
      });
    } catch (err) {
      reportFailure('mute-author', err);
    }
  }

  async function timeoutAuthor() {
    if (!user || !profile) return;
    const reason = promptModerationReason('Timeout', comment.authorUsername);
    if (!reason) return;
    try {
      await timeoutUser(comment.authorUid, user.uid, profile.username, reason);
      logActivity(forumSlug, user.uid, profile.username, 'user_timed_out', {
        targetType: 'user',
        targetId: comment.authorUid,
        details: comment.authorUsername,
      });
    } catch (err) {
      reportFailure('timeout-author', err);
    }
  }

  const actions: MenuAction[] = [];
  if (isAuthor && !comment.isDeleted) actions.push({ label: 'Edit', onPress: () => setEditOpen(true) });
  if ((isAuthor || canModerate) && !comment.isDeleted) {
    actions.push({ label: 'Delete', destructive: true, onPress: deleteComment });
  }
  if (canModerate) {
    actions.push({ label: `Mute @${comment.authorUsername}`, onPress: muteAuthor });
    actions.push({ label: `Timeout @${comment.authorUsername}`, destructive: true, onPress: timeoutAuthor });
  }
  if (!isAuthor) actions.push({ label: 'Report', onPress: () => setReportOpen(true) });

  const displayLabel = comment.authorDisplayName || comment.authorUsername;

  return (
    <>
      <View style={[styles.row, isMobile && styles.rowMobile]}>
        <Avatar size={28} label={displayLabel} />
        <View style={[styles.bubble, isMobile && styles.bubbleMobile]}>
          <View style={styles.meta}>
            <Text
              style={styles.author}
              onPress={() => router.push(`/profile/${comment.authorUsername}`)}
            >
              {displayLabel}
            </Text>
            <Text
              style={styles.handle}
              onPress={() => router.push(`/profile/${comment.authorUsername}`)}
            >
              @{comment.authorUsername}
            </Text>
            <UserRoleTags
              username={comment.authorUsername}
              uid={comment.authorUid}
              moderatorUids={moderatorUids}
              isAuthor={isPostAuthor}
            />
            <Text style={styles.timestamp}>
              {' '}· {timeAgo(comment.createdAt)}
              {comment.editedAt ? ' · edited' : ''}
            </Text>
            {actions.length > 0 && (
              <TouchableOpacity
                onPress={() => setMenuOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.moreBtn}
              >
                <MoreIcon size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.body}>
            <MarkdownBody size="small">{comment.body}</MarkdownBody>
          </View>

          <PostAttachments
            attachments={comment.attachments}
            body={comment.body}
            mode="post"
            size="small"
          />

          {canReply && !replyOpen && (
            <TouchableOpacity onPress={openReply} style={styles.replyTrigger}>
              <Text style={styles.replyTriggerLabel}>Reply</Text>
            </TouchableOpacity>
          )}

          {replyOpen && (
            <View style={styles.replyBox}>
              <InlineComposer
                value={replyText}
                onChangeText={setReplyText}
                attachments={replyAttachments}
                onAttachmentsChange={setReplyAttachments}
                onSubmit={submitReply}
                busy={replyBusy}
                size="small"
                placeholder={`Reply to @${comment.authorUsername}…`}
              />
              {replyError && <Text style={styles.replyError}>{replyError}</Text>}
              <TouchableOpacity
                onPress={() => {
                  // Clean up any files the user uploaded but is abandoning.
                  for (const a of replyAttachments) deleteAttachment(a);
                  setReplyOpen(false);
                  setReplyText('');
                  setReplyAttachments([]);
                }}
                style={styles.replyCancel}
              >
                <Text style={styles.replyCancelLabel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {children.length > 0 && (
            <TouchableOpacity
              onPress={() => setRepliesOpen((v) => !v)}
              style={styles.repliesToggle}
            >
              <Text style={styles.repliesToggleLabel}>
                {repliesOpen
                  ? `Hide ${children.length === 1 ? 'reply' : `${children.length} replies`}`
                  : `View ${children.length === 1 ? '1 reply' : `${children.length} replies`}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {repliesOpen && children.length > 0 && (
        <View
          style={[
            styles.repliesWrap,
            isMobile && styles.repliesWrapMobile,
            atIndentCap && styles.repliesWrapCapped,
          ]}
        >
          {children.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              forumSlug={forumSlug}
              postSlug={postSlug}
              postAuthorUid={postAuthorUid}
              moderatorUids={moderatorUids}
              childrenByParent={childrenByParent}
              depth={depth + 1}
              canReply={canReply}
            />
          ))}
        </View>
      )}

      <OverflowMenu visible={menuOpen} onClose={() => setMenuOpen(false)} actions={actions} />
      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        forumSlug={forumSlug}
        targetType="comment"
        targetId={comment.id}
        parentPostSlug={postSlug}
        targetAuthorUid={comment.authorUid}
        targetAuthorUsername={comment.authorUsername}
      />
      <EditModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        forumSlug={forumSlug}
        kind="comment"
        postSlug={postSlug}
        commentId={comment.id}
        initialBody={comment.body}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  rowMobile: { gap: 8 },
  // Wraps every direct-reply set in a single bordered column. The
  // border-left is what gives threaded replies a visible "thread" line —
  // and because the wrapper holds *all* siblings at this depth, the line
  // connects them properly instead of each reply having its own stub.
  repliesWrap: {
    marginLeft: 14,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.separator,
    marginBottom: 4,
  },
  repliesWrapMobile: { marginLeft: 10, paddingLeft: 10 },
  // Beyond INDENT_CAP the tree keeps growing logically but we stop
  // adding visible indent — drop the border so it doesn't keep stacking
  // a thicker and thicker rule on the left.
  repliesWrapCapped: { marginLeft: 0, paddingLeft: 0, borderLeftWidth: 0 },
  bubble: { flex: 1, backgroundColor: '#2a2a2a', padding: 12, borderRadius: 10 },
  bubbleMobile: { padding: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  author: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, fontWeight: '700' },
  handle: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginLeft: 6 },
  timestamp: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11 },
  moreBtn: { marginLeft: 'auto', padding: 2 },
  body: { marginTop: 0 },

  replyTrigger: { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 2, paddingHorizontal: 4 },
  replyTriggerLabel: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 11, fontWeight: '700' },
  repliesToggle: { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 2, paddingHorizontal: 4 },
  repliesToggleLabel: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, fontWeight: '700' },

  replyBox: { marginTop: 8 },
  replyError: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 11, marginTop: 6 },
  // Small text-only cancel under the composer — the send arrow is the
  // primary submit path so we don't need a second button competing with it.
  replyCancel: { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 2, paddingHorizontal: 4 },
  replyCancelLabel: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, fontWeight: '700' },
});

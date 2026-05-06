import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
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
import { logActivity, trackParticipant, useIsMod } from '../lib/moderation';
import { useContentFilter, violatesContentFilter } from '../lib/admin-tools';
import { Avatar } from './Avatar';
import { MoreIcon } from './Icons';
import { OverflowMenu, type MenuAction } from './OverflowMenu';
import { ReportModal } from './ReportModal';
import { EditModal } from './EditModal';
import { FormInput } from './FormInput';
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
};

export function CommentItem({
  comment,
  forumSlug,
  postSlug,
  postAuthorUid,
  isReply = false,
  canReply = true,
}: {
  comment: Comment;
  forumSlug: string;
  postSlug: string;
  postAuthorUid: string;
  isReply?: boolean;
  canReply?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useUserProfile();
  const isMod = useIsMod(forumSlug);
  const filter = useContentFilter();
  const isAuthor = !!user && user.uid === comment.authorUid;
  const isPostAuthor = comment.authorUid === postAuthorUid;

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  function openReply() {
    setReplyError(null);
    // Pre-fill an @mention so the recipient is obvious in the body, since we
    // flatten threads to a single visual indent level.
    setReplyText(`@${comment.authorUsername} `);
    setReplyOpen(true);
  }

  async function submitReply() {
    setReplyError(null);
    const t = replyText.trim();
    if (!t) return;
    if (!user || !profile) return setReplyError('You must be signed in.');
    const blocked = violatesContentFilter(t, filter.words);
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
    } catch (err: unknown) {
      console.error('[reply:create] failed:', err);
      const e = err as { code?: string; message?: string };
      setReplyError(`Could not reply (${e.code ?? e.message ?? 'unknown error'}).`);
    } finally {
      setReplyBusy(false);
    }
  }

  async function deleteComment() {
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
    }
  }

  const actions: MenuAction[] = [];
  if (isAuthor) actions.push({ label: 'Edit', onPress: () => setEditOpen(true) });
  if (isAuthor || isMod) actions.push({ label: 'Delete', destructive: true, onPress: deleteComment });
  if (!isAuthor) actions.push({ label: 'Report', onPress: () => setReportOpen(true) });

  return (
    <>
      <View style={[styles.row, isReply && styles.rowReply]}>
        <Avatar size={isReply ? 24 : 28} label={comment.authorDisplayName || comment.authorUsername} />
        <View style={styles.bubble}>
          <View style={styles.meta}>
            <Text
              style={styles.username}
              onPress={() => router.push(`/user/${comment.authorUsername}`)}
            >
              {comment.authorUsername}
            </Text>
            {isPostAuthor && <Text style={styles.authorTag}>AUTHOR</Text>}
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
          <Text style={styles.body}>{comment.body}</Text>

          {canReply && !replyOpen && (
            <TouchableOpacity onPress={openReply} style={styles.replyTrigger}>
              <Text style={styles.replyTriggerLabel}>Reply</Text>
            </TouchableOpacity>
          )}

          {replyOpen && (
            <View style={styles.replyBox}>
              <FormInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Reply…"
                multiline
                style={{ height: 60, paddingTop: 10, fontSize: 13 }}
              />
              {replyError && <Text style={styles.replyError}>{replyError}</Text>}
              <View style={styles.replyActions}>
                <TouchableOpacity
                  onPress={() => {
                    setReplyOpen(false);
                    setReplyText('');
                  }}
                  style={styles.replyCancel}
                >
                  <Text style={styles.replyCancelLabel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={submitReply} style={styles.replySubmit} disabled={replyBusy}>
                  {replyBusy ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.replySubmitLabel}>Reply</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

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
  rowReply: {
    marginLeft: 36,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.separator,
  },
  bubble: { flex: 1, backgroundColor: '#2a2a2a', padding: 12, borderRadius: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  username: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 12, fontWeight: '700' },
  authorTag: {
    marginLeft: 6,
    backgroundColor: COLORS.yellow,
    color: '#000',
    fontSize: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    fontFamily: BODY_FONT,
    fontWeight: '700',
    letterSpacing: 0.4,
    overflow: 'hidden',
  },
  timestamp: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11 },
  moreBtn: { marginLeft: 'auto', padding: 2 },
  body: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, lineHeight: 18 },

  replyTrigger: { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 2, paddingHorizontal: 4 },
  replyTriggerLabel: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 11, fontWeight: '700' },

  replyBox: { marginTop: 8 },
  replyError: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 11, marginBottom: 4 },
  replyActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  replyCancel: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  replyCancelLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  replySubmit: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.yellow,
    minWidth: 70,
    alignItems: 'center',
  },
  replySubmitLabel: { color: '#000', fontFamily: BODY_FONT, fontSize: 12, fontWeight: '700' },
});

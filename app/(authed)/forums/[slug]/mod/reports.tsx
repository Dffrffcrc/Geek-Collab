import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { useAuth } from '../../../../../lib/auth';
import { useUserProfile } from '../../../../../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../../../lib/theme';
import { timeAgo } from '../../../../../lib/forum-utils';
import {
  REPORT_REASONS,
  logActivity,
  muteUser,
  setPostQuarantine,
  timeoutUser,
  type Report,
} from '../../../../../lib/moderation';
import { FormInput } from '../../../../../components/FormInput';
import { isAdminUsername, useIsServerAdmin } from '../../../../../lib/admins';
import { promptModerationReason } from '../../../../../lib/admin-tools';

export default function ReportsTab() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const profile = useUserProfile();
  const viewerIsAdmin = useIsServerAdmin();

  const [reports, setReports] = useState<Report[] | null>(null);
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('All');
  // Track per-target soft-delete and quarantine state so we can hide
  // already-applied actions (Delete on already-deleted content, Quarantine
  // on already-quarantined posts).
  const [deletedTargets, setDeletedTargets] = useState<Record<string, boolean>>({});
  const [quarantinedPosts, setQuarantinedPosts] = useState<Record<string, boolean>>({});
  // Forum-scope mute presence (uid -> muted) and global timeout presence
  // (uid -> active timeout). Drive disabled-state for Mute and Timeout
  // buttons so a mod can't fire the same action twice in a row.
  const [mutedUids, setMutedUids] = useState<Set<string>>(new Set());
  const [timedOutUids, setTimedOutUids] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  function flagError(scope: string, err: unknown) {
    console.error(`[mod:${scope}] failed:`, err);
    const e = err as { code?: string; message?: string };
    setActionError(`${scope}: ${e.code ?? e.message ?? 'unknown error'}`);
  }

  useEffect(() => {
    if (!slug) return;
    const q = query(collection(db, 'forums', slug, 'reports'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        setReports(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Report, 'id'>) })));
      },
      (err) => {
        console.warn('[mod:reports] subscribe failed:', err);
        // Clear the loading spinner so the page doesn't appear stuck.
        setReports([]);
        setActionError(`reports: ${err.code ?? err.message}`);
      },
    );
  }, [slug]);

  // For each open report, fetch the underlying post/comment once to know if
  // it's already soft-deleted (and for posts, whether it's quarantined).
  // Used to hide actions that have already been applied — clicking
  // Delete/Quarantine on already-handled content was a no-op that confused
  // mods.
  useEffect(() => {
    if (!slug || !reports) return;
    const open = reports.filter((r) => r.status === 'open' || r.status === 'quarantined');
    let cancelled = false;
    (async () => {
      const deletedUpdates: Record<string, boolean> = {};
      const quarantineUpdates: Record<string, boolean> = {};
      await Promise.all(
        open.map(async (r) => {
          const key = `${r.targetType}:${r.targetId}`;
          const needsDeleted = deletedTargets[key] === undefined;
          const needsQuarantine =
            r.targetType === 'post' && quarantinedPosts[r.targetId] === undefined;
          if (!needsDeleted && !needsQuarantine) return;
          try {
            const ref =
              r.targetType === 'comment'
                ? doc(db, 'forums', slug, 'posts', r.parentPostSlug ?? '_', 'comments', r.targetId)
                : doc(db, 'forums', slug, 'posts', r.targetId);
            const snap = await getDoc(ref);
            if (needsDeleted) {
              deletedUpdates[key] = snap.exists() ? !!snap.data().isDeleted : true;
            }
            if (needsQuarantine && snap.exists()) {
              quarantineUpdates[r.targetId] = !!snap.data().isQuarantined;
            }
          } catch {
            /* ignore — leave as undefined so we re-check next snapshot */
          }
        }),
      );
      if (cancelled) return;
      if (Object.keys(deletedUpdates).length > 0) {
        setDeletedTargets((prev) => ({ ...prev, ...deletedUpdates }));
      }
      if (Object.keys(quarantineUpdates).length > 0) {
        setQuarantinedPosts((prev) => ({ ...prev, ...quarantineUpdates }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, reports, deletedTargets, quarantinedPosts]);

  // Forum-scope mute presence — drives the "Mute" button's disabled state.
  useEffect(() => {
    if (!slug) return;
    return onSnapshot(
      collection(db, 'forums', slug, 'mutes'),
      (snap) => setMutedUids(new Set(snap.docs.map((d) => d.id))),
      (err) => console.warn('[mod:reports] mutes subscribe failed:', err),
    );
  }, [slug]);

  // Global active-timeout presence — drives the "Timeout" button's disabled
  // state. Filters out timeouts whose `expiresAt` has elapsed, so an old
  // expired timeout doesn't permanently grey out the button.
  useEffect(() => {
    return onSnapshot(
      collection(db, 'timeouts'),
      (snap) => {
        const now = Date.now();
        const active = new Set<string>();
        snap.docs.forEach((d) => {
          const data = d.data();
          const expMs = (data.expiresAt as Timestamp | null | undefined)?.toMillis?.() ?? null;
          if (expMs === null || expMs > now) active.add(d.id);
        });
        setTimedOutUids(active);
      },
      (err) => console.warn('[mod:reports] timeouts subscribe failed:', err),
    );
  }, []);

  const filtered = useMemo(() => {
    if (!reports) return [];
    const q = search.trim().toLowerCase();
    return reports
      .filter((r) => r.status === 'open' || r.status === 'quarantined')
      .filter((r) => reasonFilter === 'All' || r.reason === reasonFilter)
      .filter(
        (r) =>
          !q ||
          r.reason.toLowerCase().includes(q) ||
          r.details.toLowerCase().includes(q) ||
          r.reporterUsername.toLowerCase().includes(q) ||
          r.targetId.toLowerCase().includes(q),
      );
  }, [reports, search, reasonFilter]);

  async function deletePost(postSlug: string, postTitle?: string) {
    if (!confirm('Delete this post?')) return;
    if (!user || !profile) return;
    setActionError(null);
    try {
      await updateDoc(doc(db, 'forums', slug!, 'posts', postSlug), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user.uid,
        deletedByUsername: profile.username,
      });
      setDeletedTargets((prev) => ({ ...prev, [`post:${postSlug}`]: true }));
      logActivity(slug!, user.uid, profile.username, 'post_deleted', {
        targetType: 'post',
        targetId: postSlug,
        details: postTitle,
      });
    } catch (err) {
      flagError('delete-post', err);
    }
  }

  async function deleteComment(postSlug: string, commentId: string) {
    if (!confirm('Delete this comment?')) return;
    if (!user || !profile) return;
    setActionError(null);
    try {
      await updateDoc(doc(db, 'forums', slug!, 'posts', postSlug, 'comments', commentId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user.uid,
        deletedByUsername: profile.username,
      });
      setDeletedTargets((prev) => ({ ...prev, [`comment:${commentId}`]: true }));
      logActivity(slug!, user.uid, profile.username, 'comment_deleted', {
        targetType: 'comment',
        targetId: commentId,
      });
    } catch (err) {
      flagError('delete-comment', err);
    }
  }

  async function quarantine(postSlug: string) {
    setActionError(null);
    try {
      await setPostQuarantine(slug!, postSlug, true);
      if (user && profile) {
        logActivity(slug!, user.uid, profile.username, 'post_quarantined', {
          targetType: 'post',
          targetId: postSlug,
        });
      }
    } catch (err) {
      flagError('quarantine', err);
    }
  }

  async function muteAuthor(targetUid: string, targetUsername: string) {
    if (!user) return;
    if (!confirm(`Mute @${targetUsername} in this forum?`)) return;
    setActionError(null);
    try {
      await muteUser(slug!, targetUid, user.uid);
      if (profile) {
        logActivity(slug!, user.uid, profile.username, 'user_muted', {
          targetType: 'user',
          targetId: targetUid,
          details: targetUsername,
        });
      }
    } catch (err) {
      flagError('mute', err);
    }
  }

  async function timeoutAuthor(targetUid: string, targetUsername: string) {
    if (!user || !profile) return;
    const reason = promptModerationReason('Timeout', targetUsername);
    if (!reason) return;
    setActionError(null);
    try {
      await timeoutUser(targetUid, user.uid, profile.username, reason);
      logActivity(slug!, user.uid, profile.username, 'user_timed_out', {
        targetType: 'user',
        targetId: targetUid,
        details: targetUsername,
      });
    } catch (err) {
      flagError('timeout', err);
    }
  }

  // Mods clear a report by marking it resolved. We used to also expose a
  // "Dismiss" button that hard-deleted the report doc, but it did the same
  // thing visually (vanished from the open queue) while losing the audit
  // trail. One button, one outcome.
  async function resolveReport(reportId: string) {
    setActionError(null);
    try {
      await updateDoc(doc(db, 'forums', slug!, 'reports', reportId), {
        status: 'resolved',
      });
      if (user && profile) {
        logActivity(slug!, user.uid, profile.username, 'report_resolved', {
          targetType: 'report',
          targetId: reportId,
        });
      }
    } catch (err) {
      flagError('resolve-report', err);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Reports</Text>

      <FormInput placeholder="Search reason / details / reporter / target…" value={search} onChangeText={setSearch} />

      {actionError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Action failed. {actionError}</Text>
          <TouchableOpacity onPress={() => setActionError(null)}>
            <Text style={styles.errorDismiss}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {(['All', ...REPORT_REASONS] as string[]).map((r) => {
          const active = r === reasonFilter;
          return (
            <TouchableOpacity
              key={r}
              onPress={() => setReasonFilter(r)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {reports === null ? (
        <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 24 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>No matching reports.</Text>
      ) : (
        filtered.map((r) => {
          const isCommentReport = r.targetType === 'comment';
          const targetPath = isCommentReport
            ? `/forums/${slug}/${r.parentPostSlug ?? ''}`
            : `/forums/${slug}/${r.targetId}`;
          const targetAlreadyDeleted = !!deletedTargets[`${r.targetType}:${r.targetId}`];
          const postAlreadyQuarantined =
            r.targetType === 'post' && !!quarantinedPosts[r.targetId];
          const authorAlreadyMuted =
            !!r.targetAuthorUid && mutedUids.has(r.targetAuthorUid);
          const authorAlreadyTimedOut =
            !!r.targetAuthorUid && timedOutUids.has(r.targetAuthorUid);
          return (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.reasonTag}>{r.reason.toUpperCase()}</Text>
                <Text style={styles.statusTag}>{r.status}</Text>
                <Text style={styles.timestamp}>{timeAgo(r.createdAt as Timestamp)}</Text>
              </View>
              <Text style={styles.summary}>
                {isCommentReport ? 'Comment' : 'Post'} reported by{' '}
                <Text style={styles.username} onPress={() => router.push(`/profile/${r.reporterUsername}`)}>
                  @{r.reporterUsername}
                </Text>
              </Text>
              {!!r.details && <Text style={styles.details}>{r.details}</Text>}

              <View style={styles.actions}>
                <ActBtn label="View" onPress={() => router.push(targetPath as never)} />
                {/* Mods can't act on admin authors; admins can act on anyone. */}
                {(viewerIsAdmin || !isAdminUsername(r.targetAuthorUsername)) && (
                  <>
                    {!isCommentReport && !postAlreadyQuarantined && (
                      <ActBtn label="Quarantine" onPress={() => quarantine(r.targetId)} />
                    )}
                    {!isCommentReport && postAlreadyQuarantined && (
                      <Text style={styles.alreadyDeleted}>Already quarantined</Text>
                    )}
                    {!targetAlreadyDeleted && (
                      <ActBtn
                        label={isCommentReport ? 'Delete comment' : 'Delete post'}
                        destructive
                        onPress={() =>
                          isCommentReport
                            ? deleteComment(r.parentPostSlug!, r.targetId)
                            : deletePost(r.targetId)
                        }
                      />
                    )}
                    {targetAlreadyDeleted && (
                      <Text style={styles.alreadyDeleted}>
                        {isCommentReport ? 'Comment' : 'Post'} already deleted
                      </Text>
                    )}
                    {r.targetAuthorUid && r.targetAuthorUsername && (
                      <>
                        {!authorAlreadyMuted && (
                          <ActBtn
                            label={`Mute @${r.targetAuthorUsername}`}
                            onPress={() => muteAuthor(r.targetAuthorUid!, r.targetAuthorUsername!)}
                          />
                        )}
                        {authorAlreadyMuted && (
                          <Text style={styles.alreadyDeleted}>
                            @{r.targetAuthorUsername} already muted
                          </Text>
                        )}
                        {!authorAlreadyTimedOut && (
                          <ActBtn
                            label="Timeout author"
                            destructive
                            onPress={() => timeoutAuthor(r.targetAuthorUid!, r.targetAuthorUsername!)}
                          />
                        )}
                        {authorAlreadyTimedOut && (
                          <Text style={styles.alreadyDeleted}>
                            @{r.targetAuthorUsername} already timed out
                          </Text>
                        )}
                      </>
                    )}
                  </>
                )}
                <ActBtn label="Resolve" onPress={() => resolveReport(r.id)} />
              </View>
            </View>
          );
        })
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
    <TouchableOpacity
      onPress={onPress}
      style={[styles.actBtn, destructive && styles.actBtnDestructive]}
    >
      <Text style={[styles.actBtnLabel, destructive && styles.actBtnLabelDestructive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 24, marginBottom: 16 },
  chipRow: { gap: 8, paddingVertical: 8, marginBottom: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#1f1f1f',
  },
  chipActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  chipText: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  chipTextActive: { color: '#000', fontWeight: '700' },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginTop: 16 },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reasonTag: {
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
    overflow: 'hidden',
  },
  statusTag: {
    backgroundColor: '#3a3a3a',
    color: COLORS.textMuted,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: BODY_FONT,
    fontWeight: '700',
    overflow: 'hidden',
  },
  timestamp: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginLeft: 'auto' },
  summary: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 8 },
  username: { color: COLORS.yellow, fontWeight: '700' },
  details: { color: '#cccccc', fontFamily: BODY_FONT, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  actBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  actBtnDestructive: { borderColor: COLORS.error },
  actBtnLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  actBtnLabelDestructive: { color: COLORS.error },
  actionHint: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  alreadyDeleted: {
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    fontSize: 11,
    fontStyle: 'italic',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,118,118,0.15)',
    borderColor: COLORS.error,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  errorBannerText: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 12, flex: 1 },
  errorDismiss: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 18, paddingHorizontal: 4 },
});

import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  deleteDoc,
  doc,
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
import { isAdminUsername } from '../../../../../lib/admins';

export default function ReportsTab() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const profile = useUserProfile();

  const [reports, setReports] = useState<Report[] | null>(null);
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('All');

  useEffect(() => {
    if (!slug) return;
    const q = query(collection(db, 'forums', slug, 'reports'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setReports(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Report, 'id'>) })));
    });
  }, [slug]);

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

  async function deletePost(postSlug: string) {
    if (!confirm('Delete this post?')) return;
    if (!user || !profile) return;
    try {
      await updateDoc(doc(db, 'forums', slug!, 'posts', postSlug), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user.uid,
        deletedByUsername: profile.username,
      });
      logActivity(slug!, user.uid, profile.username, 'post_deleted', {
        targetType: 'post',
        targetId: postSlug,
      });
    } catch (err) {
      console.error('[mod:delete-post] failed:', err);
    }
  }

  async function deleteComment(postSlug: string, commentId: string) {
    if (!confirm('Delete this comment?')) return;
    if (!user || !profile) return;
    try {
      await updateDoc(doc(db, 'forums', slug!, 'posts', postSlug, 'comments', commentId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user.uid,
        deletedByUsername: profile.username,
      });
      logActivity(slug!, user.uid, profile.username, 'comment_deleted', {
        targetType: 'comment',
        targetId: commentId,
      });
    } catch (err) {
      console.error('[mod:delete-comment] failed:', err);
    }
  }

  async function quarantine(postSlug: string) {
    try {
      await setPostQuarantine(slug!, postSlug, true);
      if (user && profile) {
        logActivity(slug!, user.uid, profile.username, 'post_quarantined', {
          targetType: 'post',
          targetId: postSlug,
        });
      }
    } catch (err) {
      console.error('[mod:quarantine] failed:', err);
    }
  }

  async function muteAuthor(targetUid: string, targetUsername: string) {
    if (!user) return;
    if (!confirm(`Mute @${targetUsername} in this forum?`)) return;
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
      console.error('[mod:mute] failed:', err);
    }
  }

  async function timeoutAuthor(targetUid: string, targetUsername: string) {
    if (!user || !profile) return;
    if (!confirm(`Timeout @${targetUsername} globally? This blocks them across every forum.`)) return;
    try {
      await timeoutUser(targetUid, user.uid, profile.username);
      logActivity(slug!, user.uid, profile.username, 'user_timed_out', {
        targetType: 'user',
        targetId: targetUid,
        details: targetUsername,
      });
    } catch (err) {
      console.error('[mod:timeout] failed:', err);
    }
  }

  async function deleteReport(reportId: string) {
    if (!confirm('Dismiss this report?')) return;
    try {
      await deleteDoc(doc(db, 'forums', slug!, 'reports', reportId));
    } catch (err) {
      console.error('[mod:delete-report] failed:', err);
    }
  }

  async function resolveReport(reportId: string) {
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
      console.error('[mod:resolve] failed:', err);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Reports</Text>

      <FormInput placeholder="Search reason / details / reporter / target…" value={search} onChangeText={setSearch} />

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
          // For mute/timeout, we don't have the author uid in the report unless we
          // look up the post/comment. Leave it as a stub the mod can fill in by
          // jumping to the user's profile.
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
                {/* Mods can't act on admin authors. */}
                {!isAdminUsername(r.targetAuthorUsername) && (
                  <>
                    {!isCommentReport && (
                      <ActBtn label="Quarantine" onPress={() => quarantine(r.targetId)} />
                    )}
                    <ActBtn
                      label={isCommentReport ? 'Delete comment' : 'Delete post'}
                      destructive
                      onPress={() =>
                        isCommentReport
                          ? deleteComment(r.parentPostSlug!, r.targetId)
                          : deletePost(r.targetId)
                      }
                    />
                    {r.targetAuthorUid && r.targetAuthorUsername && (
                      <>
                        <ActBtn
                          label={`Mute @${r.targetAuthorUsername}`}
                          onPress={() => muteAuthor(r.targetAuthorUid!, r.targetAuthorUsername!)}
                        />
                        <ActBtn
                          label="Timeout author"
                          destructive
                          onPress={() => timeoutAuthor(r.targetAuthorUid!, r.targetAuthorUsername!)}
                        />
                      </>
                    )}
                  </>
                )}
                <ActBtn label="Resolve" onPress={() => resolveReport(r.id)} />
                <ActBtn label="Dismiss" destructive onPress={() => deleteReport(r.id)} />
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
    backgroundColor: 'rgba(255,118,118,0.18)',
    color: COLORS.error,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
});

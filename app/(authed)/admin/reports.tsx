import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { useUserProfile } from '../../../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { timeAgo } from '../../../lib/forum-utils';
import { REPORT_REASONS, logActivity, type Report } from '../../../lib/moderation';
import { banUser, softDeletePost, softDeleteComment } from '../../../lib/admin-tools';
import { setPostQuarantine } from '../../../lib/moderation';
import { FormInput } from '../../../components/FormInput';

type ReportWithForum = Report & { forumSlug: string };

export default function AdminReports() {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useUserProfile();

  const [reports, setReports] = useState<ReportWithForum[] | null>(null);
  const [forums, setForums] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('All');
  const [forumFilter, setForumFilter] = useState<string>('All');

  // Forum names for the filter dropdown.
  useEffect(() => {
    return onSnapshot(collection(db, 'forums'), (snap) => {
      const map = new Map<string, string>();
      snap.docs.forEach((d) => map.set(d.id, (d.data().name as string) ?? d.id));
      setForums(map);
    });
  }, []);

  useEffect(() => {
    const q = query(collectionGroup(db, 'reports'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        setReports(
          snap.docs.map((d) => {
            const segments = d.ref.path.split('/');
            return {
              id: d.id,
              forumSlug: segments[1],
              ...(d.data() as Omit<Report, 'id'>),
            };
          }),
        );
      },
      (err) => {
        console.warn('[admin:reports] failed (likely needs index):', err);
        setReports([]);
      },
    );
  }, []);

  const filtered = useMemo(() => {
    if (!reports) return [];
    const q = search.trim().toLowerCase();
    return reports
      .filter((r) => reasonFilter === 'All' || r.reason === reasonFilter)
      .filter((r) => forumFilter === 'All' || r.forumSlug === forumFilter)
      .filter(
        (r) =>
          !q ||
          r.reason.toLowerCase().includes(q) ||
          r.details.toLowerCase().includes(q) ||
          r.reporterUsername.toLowerCase().includes(q) ||
          (r.targetAuthorUsername ?? '').toLowerCase().includes(q) ||
          r.targetId.toLowerCase().includes(q) ||
          r.forumSlug.toLowerCase().includes(q),
      );
  }, [reports, search, reasonFilter, forumFilter]);

  async function deletePost(forumSlug: string, postSlug: string) {
    if (!confirm('Delete this post?')) return;
    if (!user || !profile) return;
    try {
      await softDeletePost(forumSlug, postSlug, user.uid, profile.username);
      logActivity(forumSlug, user.uid, profile.username, 'post_deleted', {
        targetType: 'post',
        targetId: postSlug,
      });
    } catch (err) {
      console.error('[admin:report:delete-post] failed:', err);
    }
  }

  async function deleteComment(forumSlug: string, postSlug: string, commentId: string) {
    if (!confirm('Delete this comment?')) return;
    if (!user || !profile) return;
    try {
      await softDeleteComment(forumSlug, postSlug, commentId, user.uid, profile.username);
      logActivity(forumSlug, user.uid, profile.username, 'comment_deleted', {
        targetType: 'comment',
        targetId: commentId,
      });
    } catch (err) {
      console.error('[admin:report:delete-comment] failed:', err);
    }
  }

  async function quarantine(forumSlug: string, postSlug: string) {
    if (!user || !profile) return;
    try {
      await setPostQuarantine(forumSlug, postSlug, true);
      logActivity(forumSlug, user.uid, profile.username, 'post_quarantined', {
        targetType: 'post',
        targetId: postSlug,
      });
    } catch (err) {
      console.error('[admin:report:quarantine] failed:', err);
    }
  }

  async function ban(targetUid: string, targetUsername: string, forumSlug: string) {
    if (!user || !profile) return;
    if (!confirm(`Ban @${targetUsername} from the entire app?`)) return;
    try {
      await banUser(targetUid, user.uid, profile.username);
      logActivity(forumSlug, user.uid, profile.username, 'user_timed_out', {
        targetType: 'user',
        targetId: targetUid,
        details: `${targetUsername} (banned)`,
      });
    } catch (err) {
      console.error('[admin:report:ban] failed:', err);
    }
  }

  async function resolveReport(forumSlug: string, reportId: string) {
    if (!user || !profile) return;
    try {
      await updateDoc(doc(db, 'forums', forumSlug, 'reports', reportId), {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        resolvedBy: user.uid,
      });
      logActivity(forumSlug, user.uid, profile.username, 'report_resolved', {
        targetType: 'report',
        targetId: reportId,
      });
    } catch (err) {
      console.error('[admin:report:resolve] failed:', err);
    }
  }

  async function dismissReport(forumSlug: string, reportId: string) {
    if (!confirm('Dismiss this report?')) return;
    try {
      await deleteDoc(doc(db, 'forums', forumSlug, 'reports', reportId));
    } catch (err) {
      console.error('[admin:report:dismiss] failed:', err);
    }
  }

  const forumOptions = ['All', ...Array.from(forums.keys()).sort()];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Content moderation queue</Text>
      <Text style={styles.sub}>All reports across every forum, newest first.</Text>

      <FormInput
        placeholder="Search reason / details / reporter / author / forum…"
        value={search}
        onChangeText={setSearch}
      />

      <Text style={styles.filterLabel}>Reason</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {(['All', ...REPORT_REASONS] as string[]).map((r) => (
          <Chip key={r} label={r} active={r === reasonFilter} onPress={() => setReasonFilter(r)} />
        ))}
      </ScrollView>

      <Text style={styles.filterLabel}>Forum</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {forumOptions.map((slug) => (
          <Chip
            key={slug}
            label={slug === 'All' ? 'All' : forums.get(slug) ?? slug}
            active={slug === forumFilter}
            onPress={() => setForumFilter(slug)}
          />
        ))}
      </ScrollView>

      {reports === null ? (
        <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 24 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>No matching reports.</Text>
      ) : (
        filtered.map((r) => {
          const isCommentReport = r.targetType === 'comment';
          const targetPath = isCommentReport
            ? `/forums/${r.forumSlug}/${r.parentPostSlug ?? ''}`
            : `/forums/${r.forumSlug}/${r.targetId}`;
          return (
            <View key={`${r.forumSlug}/${r.id}`} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.reasonTag}>{r.reason.toUpperCase()}</Text>
                <Text style={styles.statusTag}>{r.status}</Text>
                <Text style={styles.forumTag}>in {forums.get(r.forumSlug) ?? r.forumSlug}</Text>
                <Text style={styles.timestamp}>{timeAgo(r.createdAt as Timestamp)}</Text>
              </View>
              <Text style={styles.summary}>
                {isCommentReport ? 'Comment' : 'Post'} reported by{' '}
                <Text style={styles.username} onPress={() => router.push(`/user/${r.reporterUsername}`)}>
                  @{r.reporterUsername}
                </Text>
                {r.targetAuthorUsername && (
                  <>
                    {' '}against{' '}
                    <Text
                      style={styles.username}
                      onPress={() => router.push(`/user/${r.targetAuthorUsername}`)}
                    >
                      @{r.targetAuthorUsername}
                    </Text>
                  </>
                )}
              </Text>
              {!!r.details && <Text style={styles.details}>{r.details}</Text>}

              <View style={styles.actions}>
                <ActBtn label="View" onPress={() => router.push(targetPath as never)} />
                {!isCommentReport && (
                  <ActBtn label="Quarantine" onPress={() => quarantine(r.forumSlug, r.targetId)} />
                )}
                <ActBtn
                  label={isCommentReport ? 'Delete comment' : 'Delete post'}
                  destructive
                  onPress={() =>
                    isCommentReport
                      ? deleteComment(r.forumSlug, r.parentPostSlug!, r.targetId)
                      : deletePost(r.forumSlug, r.targetId)
                  }
                />
                {r.targetAuthorUid && r.targetAuthorUsername && (
                  <ActBtn
                    label={`Ban @${r.targetAuthorUsername}`}
                    destructive
                    onPress={() => ban(r.targetAuthorUid!, r.targetAuthorUsername!, r.forumSlug)}
                  />
                )}
                <ActBtn label="Resolve" onPress={() => resolveReport(r.forumSlug, r.id)} />
                <ActBtn label="Dismiss" destructive onPress={() => dismissReport(r.forumSlug, r.id)} />
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
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
  sub: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 16 },
  filterLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12, marginTop: 6, marginBottom: 6 },
  chipRow: { gap: 8, paddingBottom: 4 },
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
  card: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  reasonTag: {
    backgroundColor: 'rgba(255,118,118,0.18)', color: COLORS.error,
    fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    fontFamily: BODY_FONT, fontWeight: '700', overflow: 'hidden',
  },
  statusTag: {
    backgroundColor: '#3a3a3a', color: COLORS.textMuted,
    fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    fontFamily: BODY_FONT, fontWeight: '700', overflow: 'hidden',
  },
  forumTag: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11 },
  timestamp: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginLeft: 'auto' },
  summary: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 8 },
  username: { color: COLORS.yellow, fontWeight: '700' },
  details: { color: '#cccccc', fontFamily: BODY_FONT, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: '#3a3a3a',
  },
  actBtnDestructive: { borderColor: COLORS.error },
  actBtnLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  actBtnLabelDestructive: { color: COLORS.error },
});

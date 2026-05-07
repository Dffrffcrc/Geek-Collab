import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  Timestamp,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { useAuth } from '../../../../../lib/auth';
import { useUserProfile } from '../../../../../lib/user-profile';
import { useIsServerAdmin } from '../../../../../lib/admins';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../../../lib/theme';
import { isClosed, timeAgo } from '../../../../../lib/forum-utils';
import { deleteForumCascading, logActivity, type Activity } from '../../../../../lib/moderation';

export default function ModDashboard() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const profile = useUserProfile();
  const isServerAdmin = useIsServerAdmin();

  const [postCount, setPostCount] = useState<number | null>(null);
  const [openReports, setOpenReports] = useState<number | null>(null);
  const [quarantined, setQuarantined] = useState<number | null>(null);
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [forumClosed, setForumClosed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!slug) return;
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(doc(db, 'forums', slug), (snap) => {
        if (!snap.exists()) return;
        const closesAt = snap.data().closesAt as Timestamp | undefined;
        setForumClosed(closesAt ? isClosed(closesAt) : false);
      }),
    );

    unsubs.push(
      onSnapshot(collection(db, 'forums', slug, 'posts'), (snap) => {
        setPostCount(snap.size);
        setQuarantined(snap.docs.filter((d) => d.data().isQuarantined === true).length);
      }),
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'forums', slug, 'reports'), where('status', '==', 'open')),
        (snap) => setOpenReports(snap.size),
      ),
    );

    unsubs.push(
      onSnapshot(collection(db, 'forums', slug, 'participants'), (snap) =>
        setActiveUsers(snap.size),
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'forums', slug, 'activity'), orderBy('createdAt', 'desc'), limit(15)),
        (snap) =>
          setRecentActivity(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Activity, 'id'>) })),
          ),
      ),
    );

    return () => unsubs.forEach((u) => u());
  }, [slug]);

  async function closeForum() {
    if (!slug || !user || !profile) return;
    if (
      !confirm(
        `Close the forum "${slug}"? Posts and comments will become read-only. Likes still work. You can reopen later from the admin panel.`,
      )
    )
      return;
    setClosing(true);
    try {
      // Setting closesAt to "now" trips isClosed() everywhere.
      await updateDoc(doc(db, 'forums', slug), {
        closesAt: Timestamp.fromMillis(Date.now()),
      });
      await logActivity(slug, user.uid, profile.username, 'post_edited', {
        targetType: 'post',
        targetId: slug,
        details: 'forum closed',
      });
    } catch (err: unknown) {
      console.error('[forum:close] failed:', err);
      const e = err as { code?: string; message?: string };
      alert(`Could not close forum (${e.code ?? e.message ?? 'unknown error'}).`);
    } finally {
      setClosing(false);
    }
  }

  async function deleteForum() {
    if (!slug || !user || !profile) return;
    if (
      !confirm(
        `Permanently delete the forum "${slug}" and ALL its posts, comments, reports, and activity? This cannot be undone.`,
      )
    )
      return;
    setDeleting(true);
    try {
      // Best-effort: log the action while the forum still exists.
      await logActivity(slug, user.uid, profile.username, 'post_deleted', {
        targetType: 'post',
        targetId: slug,
        details: 'forum deleted',
      });
      await deleteForumCascading(slug);
      router.replace('/forums');
    } catch (err: unknown) {
      console.error('[forum:delete] failed:', err);
      const e = err as { code?: string; message?: string };
      alert(`Could not delete forum (${e.code ?? e.message ?? 'unknown error'}).`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.tilesRow}>
        <Tile label="Open reports" value={openReports} accent={openReports && openReports > 0 ? 'warn' : 'normal'} />
        <Tile label="Quarantined" value={quarantined} />
        <Tile label="Posts" value={postCount} />
        <Tile label="Active users" value={activeUsers} />
      </View>

      <Text style={styles.sectionHeading}>Recent activity</Text>
      {recentActivity === null ? (
        <ActivityIndicator color={COLORS.yellow} />
      ) : recentActivity.length === 0 ? (
        <Text style={styles.empty}>No activity yet.</Text>
      ) : (
        recentActivity.map((a) => (
          <View key={a.id} style={styles.actRow}>
            <Text style={styles.actType}>{prettyType(a.type)}</Text>
            <Text style={styles.actBody}>
              <Text style={styles.actActor}>@{a.actorUsername}</Text>
              {a.details ? ` — ${a.details}` : ''}
            </Text>
            <Text style={styles.actTime}>{timeAgo(a.createdAt as Timestamp)}</Text>
          </View>
        ))
      )}

      {isServerAdmin && (
        <View style={styles.dangerZone}>
          <Text style={styles.dangerHeading}>Danger zone</Text>
          <Text style={styles.dangerHelp}>
            Admin-only. Closing makes the forum read-only (posts and comments stop, likes still
            work). Deleting permanently removes the forum and every post, comment, report, mute,
            and activity event inside it.
          </Text>
          <View style={styles.dangerBtnRow}>
            {!forumClosed && (
              <TouchableOpacity style={styles.closeBtn} onPress={closeForum} disabled={closing}>
                {closing ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.closeBtnLabel}>Close forum</Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.deleteBtn} onPress={deleteForum} disabled={deleting}>
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteBtnLabel}>Delete forum</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Tile({ label, value, accent }: { label: string; value: number | null; accent?: 'warn' | 'normal' }) {
  return (
    <View style={[styles.tile, accent === 'warn' && styles.tileWarn]}>
      <Text style={[styles.tileValue, accent === 'warn' && { color: COLORS.error }]}>
        {value === null ? '…' : value}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function prettyType(t: string): string {
  return t.replace(/_/g, ' ');
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64 },
  tilesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  tile: {
    minWidth: 160,
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  tileWarn: { borderColor: COLORS.error },
  tileValue: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 32 },
  tileLabel: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4 },

  sectionHeading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18, marginBottom: 12 },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13 },
  actRow: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  actType: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  actBody: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, marginTop: 4 },
  actActor: { color: COLORS.yellow, fontWeight: '700' },
  actTime: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginTop: 4 },

  dangerZone: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.error,
    paddingTop: 18,
  },
  dangerHeading: { color: COLORS.error, fontFamily: HEADING_FONT, fontSize: 16, marginBottom: 6 },
  dangerHelp: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginBottom: 12, lineHeight: 18 },
  dangerBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  closeBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.yellow,
  },
  closeBtnLabel: { color: '#000', fontFamily: BODY_FONT, fontWeight: '700', fontSize: 13 },
  deleteBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.error,
  },
  deleteBtnLabel: { color: '#fff', fontFamily: BODY_FONT, fontWeight: '700', fontSize: 13 },
});

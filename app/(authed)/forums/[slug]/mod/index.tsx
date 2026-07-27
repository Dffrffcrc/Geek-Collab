import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native';
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
import { deleteForumCascading, describeActivity, logActivity, type Activity } from '../../../../../lib/moderation';

export default function ModDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 768;
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
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!slug) return;
    const unsubs: Array<() => void> = [];


    setLoadErrors([]);





    function listen(
      label: string,
      build: () => () => void,
      onError: () => void,
    ) {
      try {
        unsubs.push(build());
      } catch (err) {
        console.warn(`[mod-dashboard] ${label} setup failed:`, err);
        const e = err as { code?: string; message?: string };
        setLoadErrors((prev) => [...prev, `${label}: ${e.code ?? e.message ?? 'unknown error'}`]);
        onError();
      }
    }

    listen(
      'forum doc',
      () =>
        onSnapshot(
          doc(db, 'forums', slug),
          (snap) => {
            if (!snap.exists()) return;
            const closesAt = snap.data().closesAt as Timestamp | undefined;
            setForumClosed(closesAt ? isClosed(closesAt) : false);
          },
          (err) => {
            console.warn('[mod-dashboard] forum doc:', err);
            setLoadErrors((prev) => [...prev, `forum doc: ${err.code ?? err.message}`]);
          },
        ),
      () => setForumClosed(false),
    );

    listen(
      'posts',
      () =>
        onSnapshot(
          collection(db, 'forums', slug, 'posts'),
          (snap) => {
            setPostCount(snap.size);
            setQuarantined(snap.docs.filter((d) => d.data().isQuarantined === true).length);
          },
          (err) => {
            console.warn('[mod-dashboard] posts:', err);
            setLoadErrors((prev) => [...prev, `posts: ${err.code ?? err.message}`]);
            setPostCount(0);
            setQuarantined(0);
          },
        ),
      () => {
        setPostCount(0);
        setQuarantined(0);
      },
    );

    listen(
      'reports',
      () =>
        onSnapshot(
          query(collection(db, 'forums', slug, 'reports'), where('status', '==', 'open')),
          (snap) => setOpenReports(snap.size),
          (err) => {
            console.warn('[mod-dashboard] reports:', err);
            setLoadErrors((prev) => [...prev, `reports: ${err.code ?? err.message}`]);
            setOpenReports(0);
          },
        ),
      () => setOpenReports(0),
    );

    listen(
      'participants',
      () =>
        onSnapshot(
          collection(db, 'forums', slug, 'participants'),
          (snap) => setActiveUsers(snap.size),
          (err) => {
            console.warn('[mod-dashboard] participants:', err);
            setLoadErrors((prev) => [...prev, `participants: ${err.code ?? err.message}`]);
            setActiveUsers(0);
          },
        ),
      () => setActiveUsers(0),
    );

    listen(
      'activity',
      () =>
        onSnapshot(
          query(collection(db, 'forums', slug, 'activity'), orderBy('createdAt', 'desc'), limit(15)),
          (snap) =>
            setRecentActivity(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Activity, 'id'>) })),
            ),
          (err) => {
            console.warn('[mod-dashboard] activity:', err);
            setLoadErrors((prev) => [...prev, `activity: ${err.code ?? err.message}`]);
            setRecentActivity([]);
          },
        ),
      () => setRecentActivity([]),
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
    <ScrollView contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}>
      {loadErrors.length > 0 && (
        <View style={styles.errBanner}>
          <Text style={styles.errBannerHead}>Some sections failed to load</Text>
          <Text style={styles.errBannerSub}>
            {loadErrors.some((e) => e.includes('permission-denied'))
              ? 'permission-denied means Firestore does not currently recognize this account as a moderator/admin for these server-side reads. Deploy firestore.rules and verify the forum moderator list and admin allowlist are correct.'
              : loadErrors.some((e) => e.includes('failed-precondition'))
              ? 'failed-precondition means a Firestore index is missing. Run "firebase deploy --only firestore:indexes" (indexes can take a few minutes to build after deploy).'
              : 'Try redeploying both rules and indexes.'}
          </Text>
          {loadErrors.map((line, i) => (
            <Text key={i} style={styles.errBannerLine}>
              {line}
            </Text>
          ))}
        </View>
      )}

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
            <View style={styles.actHead}>
              <Text style={styles.actType}>{a.type.replace(/_/g, ' ')}</Text>
              <Text style={styles.actTime}>{timeAgo(a.createdAt as Timestamp)}</Text>
            </View>
            <Text style={styles.actBody}>
              <Text style={styles.actActor}>@{a.actorUsername}</Text>
              {' '}
              {describeActivity(a)}
            </Text>
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
                  <ActivityIndicator color={COLORS.error} />
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


const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64 },
  scrollCompact: { padding: 16, paddingBottom: 36 },
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
  errBanner: {
    backgroundColor: 'rgba(255,118,118,0.12)',
    borderColor: COLORS.error,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  errBannerHead: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 13, fontWeight: '700' },
  errBannerSub: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 12, marginBottom: 4 },
  errBannerLine: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 12 },
  actRow: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  actHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  actType: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  actBody: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, lineHeight: 18 },
  actActor: { color: COLORS.yellow, fontWeight: '700' },
  actTime: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginLeft: 'auto' },

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
    borderWidth: 1.5,
    borderColor: COLORS.error,
    backgroundColor: 'transparent',
  },
  closeBtnLabel: { color: COLORS.error, fontFamily: BODY_FONT, fontWeight: '700', fontSize: 13 },
  deleteBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.error,
  },
  deleteBtnLabel: { color: '#fff', fontFamily: BODY_FONT, fontWeight: '700', fontSize: 13 },
});

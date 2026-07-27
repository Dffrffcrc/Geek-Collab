import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  collection,
  getCountFromServer,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { timeAgo } from '../../../lib/forum-utils';
import { describeActivity, type Activity } from '../../../lib/moderation';

const MOD_ACTION_TYPES = [
  'post_deleted',
  'post_quarantined',
  'post_unquarantined',
  'comment_deleted',
  'user_muted',
  'user_unmuted',
  'user_timed_out',
  'report_resolved',
];

export default function AdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const [forums, setForums] = useState<number | null>(null);
  const [openReports, setOpenReports] = useState<number | null>(null);
  const [quarantined, setQuarantined] = useState<number | null>(null);
  const [deleted, setDeleted] = useState<number | null>(null);
  const [banned, setBanned] = useState<number | null>(null);
  const [users, setUsers] = useState<number | null>(null);
  const [recentMod, setRecentMod] = useState<Activity[] | null>(null);
  const [forumSlugs, setForumSlugs] = useState<string[]>([]);


  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const pushErr = (label: string, err: { code?: string; message?: string }) =>
    setLoadErrors((prev) => [...prev, `${label}: ${err.code ?? err.message ?? 'unknown error'}`]);

  useEffect(() => {
    setLoadErrors([]);

    (async () => {
      try {
        const forumCount = (await getCountFromServer(collection(db, 'forums'))).data().count;
        setForums(forumCount);
      } catch (err) {
        console.warn('[admin:dashboard] forums count failed:', err);
        pushErr('forums', err as { code?: string; message?: string });
        setForums(0);
      }
      try {
        setUsers((await getCountFromServer(collection(db, 'users'))).data().count);
      } catch (err) {
        console.warn('[admin:dashboard] users count failed:', err);
        pushErr('users', err as { code?: string; message?: string });
        setUsers(0);
      }
    })();

    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        query(collection(db, 'forums'), orderBy('createdAt', 'desc')),
        (snap) => setForumSlugs(snap.docs.map((d) => d.id)),
        (err) => {
          console.warn('[admin:dashboard] forums list failed:', err);
          pushErr('forums list', err);
          setForumSlugs([]);
        },
      ),
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'timeouts'),
        (snap) => setBanned(snap.size),
        (err) => {
          console.warn('[admin:dashboard] timeouts failed:', err);
          pushErr('timeouts', err);
          setBanned(0);
        },
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    if (forumSlugs.length === 0) {
      setOpenReports(0);
      setQuarantined(0);
      setDeleted(0);
      setRecentMod([]);
      return;
    }

    const reportCounts = new Map<string, number>();
    const quarantineCounts = new Map<string, number>();
    const deletedCounts = new Map<string, number>();
    const activityByForum = new Map<string, Activity[]>();
    const unsubs: Array<() => void> = [];

    const sumMap = (map: Map<string, number>) =>
      Array.from(map.values()).reduce((sum, count) => sum + count, 0);
    const refreshActivities = () => {
      const merged = Array.from(activityByForum.values())
        .flat()
        .filter((a) => MOD_ACTION_TYPES.includes(a.type))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        .slice(0, 15);
      setRecentMod(merged);
    };

    for (const slug of forumSlugs) {
      unsubs.push(
        onSnapshot(
          collection(db, 'forums', slug, 'reports'),
          (snap) => {
            reportCounts.set(
              slug,
              snap.docs.filter((d) => (d.data().status ?? 'open') === 'open').length,
            );
            setOpenReports(sumMap(reportCounts));
          },
          (err) => {
            console.warn('[admin:dashboard] reports failed:', slug, err);
            pushErr('open reports', err);
            reportCounts.set(slug, 0);
            setOpenReports(sumMap(reportCounts));
          },
        ),
      );

      unsubs.push(
        onSnapshot(
          collection(db, 'forums', slug, 'posts'),
          (snap) => {
            quarantineCounts.set(
              slug,
              snap.docs.filter((d) => d.data().isQuarantined === true).length,
            );
            deletedCounts.set(
              slug,
              snap.docs.filter((d) => d.data().isDeleted === true).length,
            );
            setQuarantined(sumMap(quarantineCounts));
            setDeleted(sumMap(deletedCounts));
          },
          (err) => {
            console.warn('[admin:dashboard] posts failed:', slug, err);
            pushErr('posts', err);
            quarantineCounts.set(slug, 0);
            deletedCounts.set(slug, 0);
            setQuarantined(sumMap(quarantineCounts));
            setDeleted(sumMap(deletedCounts));
          },
        ),
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'forums', slug, 'activity'), orderBy('createdAt', 'desc')),
          (snap) => {
            activityByForum.set(
              slug,
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Activity, 'id'>) })),
            );
            refreshActivities();
          },
          (err) => {
            console.warn('[admin:dashboard] activity failed:', slug, err);
            pushErr('mod actions', err);
            activityByForum.set(slug, []);
            refreshActivities();
          },
        ),
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [forumSlugs]);

  return (
    <ScrollView contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}>
      {loadErrors.length > 0 && (
        <View style={styles.errBanner}>
          <Text style={styles.errBannerHead}>Some sections failed to load</Text>
          <Text style={styles.errBannerSub}>
            {loadErrors.some((e) => e.includes('permission-denied'))
              ? 'permission-denied means Firestore does not currently recognize this account as an admin for these server-side reads. Deploy firestore.rules and verify your username is in the admin allowlist in both firestore.rules and lib/admins.ts.'
              : loadErrors.some((e) => e.includes('failed-precondition'))
              ? 'failed-precondition means a Firestore index is missing. Run "firebase deploy --only firestore:indexes" (and wait a few minutes for indexes to build).'
              : 'Run both "firebase deploy --only firestore:rules" and "firebase deploy --only firestore:indexes".'}
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
        <Tile label="Deleted" value={deleted} />
        <Tile label="Banned / timed-out" value={banned} />
        <Tile label="Forums" value={forums} />
        <Tile label="Users" value={users} />
      </View>

      <Text style={styles.sectionHeading}>Recent moderation actions</Text>
      {recentMod === null ? (
        <ActivityIndicator color={COLORS.yellow} />
      ) : recentMod.length === 0 ? (
        <Text style={styles.empty}>No recent mod actions.</Text>
      ) : (
        recentMod.map((a) => (
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
    </ScrollView>
  );
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | null;
  accent?: 'warn' | 'normal';
}) {
  return (
    <View style={[styles.tile, accent === 'warn' && styles.tileWarn]}>
      <Text style={[styles.tileValue, accent === 'warn' && { color: COLORS.warn }]}>
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
    flex: 1,
    flexBasis: 130,
    minWidth: 130,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  tileWarn: { borderColor: COLORS.warn },
  tileValue: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 28 },
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
  code: { fontFamily: BODY_FONT, fontWeight: '700' },
  actRow: { backgroundColor: '#2a2a2a', borderRadius: 8, padding: 12, marginBottom: 8 },
  actHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  actType: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  actBody: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, lineHeight: 18 },
  actActor: { color: COLORS.yellow, fontWeight: '700' },
  actTime: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginLeft: 'auto' },
});

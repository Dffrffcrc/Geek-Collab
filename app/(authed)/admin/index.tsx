import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  collection,
  collectionGroup,
  getCountFromServer,
  onSnapshot,
  orderBy,
  query,
  where,
  limit as fsLimit,
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
  const [forums, setForums] = useState<number | null>(null);
  const [openReports, setOpenReports] = useState<number | null>(null);
  const [quarantined, setQuarantined] = useState<number | null>(null);
  const [deleted, setDeleted] = useState<number | null>(null);
  const [banned, setBanned] = useState<number | null>(null);
  const [users, setUsers] = useState<number | null>(null);
  const [recentMod, setRecentMod] = useState<Activity[] | null>(null);
  // Surface query errors instead of silently flattening them to 0 — that
  // way "missing collection-group index" doesn't look like "no data".
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const pushErr = (label: string, err: { code?: string; message?: string }) =>
    setLoadErrors((prev) => [...prev, `${label}: ${err.code ?? err.message ?? 'unknown error'}`]);

  useEffect(() => {
    setLoadErrors([]);
    // One-shot counts for the heavier queries — these don't change every second.
    (async () => {
      try {
        setForums((await getCountFromServer(collection(db, 'forums'))).data().count);
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
        query(collectionGroup(db, 'reports'), where('status', '==', 'open')),
        (snap) => setOpenReports(snap.size),
        (err) => {
          console.warn('[admin:dashboard] reports failed:', err);
          pushErr('open reports', err);
          setOpenReports(0);
        },
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collectionGroup(db, 'posts'), where('isQuarantined', '==', true)),
        (snap) => setQuarantined(snap.size),
        (err) => {
          console.warn('[admin:dashboard] quarantine failed:', err);
          pushErr('quarantine', err);
          setQuarantined(0);
        },
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collectionGroup(db, 'posts'), where('isDeleted', '==', true)),
        (snap) => setDeleted(snap.size),
        (err) => {
          console.warn('[admin:dashboard] deleted failed:', err);
          pushErr('deleted', err);
          setDeleted(0);
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

    // Recent mod actions across all forums.
    unsubs.push(
      onSnapshot(
        query(
          collectionGroup(db, 'activity'),
          where('type', 'in', MOD_ACTION_TYPES),
          orderBy('createdAt', 'desc'),
          fsLimit(15),
        ),
        (snap) =>
          setRecentMod(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Activity, 'id'>) })),
          ),
        (err) => {
          console.warn('[admin:dashboard] activity failed (likely needs index):', err);
          pushErr('mod actions', err);
          setRecentMod([]);
        },
      ),
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {loadErrors.length > 0 && (
        <View style={styles.errBanner}>
          <Text style={styles.errBannerHead}>Some sections failed to load</Text>
          <Text style={styles.errBannerSub}>
            {loadErrors.some((e) => e.includes('permission-denied'))
              ? 'permission-denied means firestore.rules is out of date. Run "firebase deploy --only firestore:rules".'
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

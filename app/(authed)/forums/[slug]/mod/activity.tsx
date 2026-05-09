import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit as fsLimit,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../../../lib/theme';
import { timeAgo } from '../../../../../lib/forum-utils';
import { describeActivity, type Activity, type ActivityType } from '../../../../../lib/moderation';
import { FormInput } from '../../../../../components/FormInput';

const FILTERS: Array<{ label: string; types: ActivityType[] | null }> = [
  { label: 'All', types: null },
  { label: 'Posts', types: ['post_created', 'post_edited', 'post_deleted', 'post_quarantined', 'post_unquarantined'] },
  { label: 'Comments', types: ['comment_created', 'comment_edited', 'comment_deleted'] },
  { label: 'Mod actions', types: ['user_muted', 'user_unmuted', 'user_timed_out', 'post_quarantined', 'post_unquarantined', 'report_resolved'] },
  { label: 'Reports', types: ['report_filed', 'report_resolved'] },
];

export default function ActivityTab() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [items, setItems] = useState<Activity[] | null>(null);
  const [search, setSearch] = useState('');
  const [filterIdx, setFilterIdx] = useState(0);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoadError(null);
    const q = query(
      collection(db, 'forums', slug, 'activity'),
      orderBy('createdAt', 'desc'),
      fsLimit(200),
    );
    return onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Activity, 'id'>) })));
      },
      (err) => {
        console.warn('[mod:activity] subscribe failed:', err);
        // Clear the spinner so the page stops looking stuck and surface
        // why we got nothing.
        setItems([]);
        setLoadError(`${err.code ?? err.message}`);
      },
    );
  }, [slug]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    const allowed = FILTERS[filterIdx].types;
    return items
      .filter((it) => !allowed || allowed.includes(it.type))
      .filter(
        (it) =>
          !q ||
          it.actorUsername.toLowerCase().includes(q) ||
          it.type.toLowerCase().includes(q) ||
          (it.details ?? '').toLowerCase().includes(q) ||
          describeActivity(it).toLowerCase().includes(q),
      );
  }, [items, search, filterIdx]);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Activity log</Text>
      <Text style={styles.sub}>Most recent 200 events. Search by actor, type, target, details.</Text>

      <FormInput placeholder="Search…" value={search} onChangeText={setSearch} />

      {loadError && (
        <View style={styles.errBanner}>
          <Text style={styles.errBannerText}>Could not load activity: {loadError}</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {FILTERS.map((f, i) => {
          const active = i === filterIdx;
          return (
            <TouchableOpacity
              key={f.label}
              onPress={() => setFilterIdx(i)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {items === null ? (
        <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 24 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>No matching events.</Text>
      ) : (
        filtered.map((a) => (
          <View key={a.id} style={styles.row}>
            <View style={styles.rowHead}>
              <Text style={styles.type}>{a.type.replace(/_/g, ' ')}</Text>
              <Text style={styles.time}>{timeAgo(a.createdAt as Timestamp)}</Text>
            </View>
            <Text style={styles.body}>
              <Text style={styles.actor}>@{a.actorUsername}</Text>
              {' '}
              {describeActivity(a)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 24, marginBottom: 4 },
  sub: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 16 },
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
  errBanner: {
    backgroundColor: 'rgba(255,118,118,0.12)',
    borderColor: COLORS.error,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  errBannerText: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 12 },
  row: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  type: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, lineHeight: 18 },
  actor: { color: COLORS.yellow, fontWeight: '700' },
  time: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginLeft: 'auto' },
});

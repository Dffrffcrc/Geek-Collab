import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
  limit as fsLimit,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { timeAgo } from '../../../lib/forum-utils';
import { describeActivity, type Activity, type ActivityType } from '../../../lib/moderation';
import { FormInput } from '../../../components/FormInput';

type ActivityWithForum = Activity & { forumSlug: string };

const FILTERS: Array<{ label: string; types: ActivityType[] | null }> = [
  { label: 'All', types: null },
  { label: 'Mod actions', types: [
      'post_quarantined', 'post_unquarantined', 'post_deleted', 'comment_deleted',
      'user_muted', 'user_unmuted', 'user_timed_out', 'report_resolved',
    ] },
  { label: 'User activity', types: [
      'post_created', 'post_edited', 'comment_created', 'comment_edited',
    ] },
  { label: 'Reports', types: ['report_filed', 'report_resolved'] },
];

export default function AdminActivity() {
  const [items, setItems] = useState<ActivityWithForum[] | null>(null);
  const [search, setSearch] = useState('');
  const [filterIdx, setFilterIdx] = useState(0);

  useEffect(() => {
    const q = query(
      collectionGroup(db, 'activity'),
      orderBy('createdAt', 'desc'),
      fsLimit(300),
    );
    return onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => {
            const segments = d.ref.path.split('/');
            return {
              id: d.id,
              forumSlug: segments[1],
              ...(d.data() as Omit<Activity, 'id'>),
            };
          }),
        );
      },
      (err) => {
        console.warn('[admin:activity] failed (likely needs index):', err);
        setItems([]);
      },
    );
  }, []);

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
          it.forumSlug.toLowerCase().includes(q) ||
          (it.details ?? '').toLowerCase().includes(q) ||
          describeActivity(it).toLowerCase().includes(q),
      );
  }, [items, search, filterIdx]);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Moderator + user activity log</Text>
      <Text style={styles.sub}>Most recent 300 events across every forum.</Text>

      <FormInput
        placeholder="Search actor / type / forum / target / details…"
        value={search}
        onChangeText={setSearch}
      />

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
          <View key={`${a.forumSlug}/${a.id}`} style={styles.row}>
            <View style={styles.rowHead}>
              <Text style={styles.type}>{a.type.replace(/_/g, ' ')}</Text>
              <Text style={styles.forum}>in {a.forumSlug}</Text>
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
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#1f1f1f',
  },
  chipActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  chipText: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  chipTextActive: { color: '#000', fontWeight: '700' },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginTop: 16 },
  row: { backgroundColor: '#2a2a2a', borderRadius: 8, padding: 12, marginBottom: 6 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  type: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  forum: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11 },
  time: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginLeft: 'auto' },
  body: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13 },
  actor: { color: COLORS.yellow, fontWeight: '700' },
});

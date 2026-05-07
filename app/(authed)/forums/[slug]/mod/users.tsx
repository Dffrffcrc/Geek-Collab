import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc,
  onSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { useAuth } from '../../../../../lib/auth';
import { useUserProfile } from '../../../../../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../../../lib/theme';
import { timeAgo } from '../../../../../lib/forum-utils';
import {
  liftTimeout,
  logActivity,
  muteUser,
  timeoutUser,
  unmuteUser,
} from '../../../../../lib/moderation';
import { Avatar } from '../../../../../components/Avatar';
import { FormInput } from '../../../../../components/FormInput';
import { UserRoleTags } from '../../../../../components/RoleTag';
import { isAdminUsername } from '../../../../../lib/admins';

type Participant = {
  uid: string;
  username: string;
  displayName: string;
  postCount?: number;
  commentCount?: number;
  lastActiveAt?: Timestamp;
};

type Filter = 'all' | 'muted' | 'timed-out';

export default function UsersTab() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const profile = useUserProfile();

  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [mutedUids, setMutedUids] = useState<Set<string>>(new Set());
  const [timedOutUids, setTimedOutUids] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!slug) return;
    return onSnapshot(collection(db, 'forums', slug, 'participants'), (snap) => {
      setParticipants(
        snap.docs.map((d) => ({
          uid: d.id,
          ...(d.data() as Omit<Participant, 'uid'>),
        })),
      );
    });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    return onSnapshot(collection(db, 'forums', slug, 'mutes'), (snap) => {
      setMutedUids(new Set(snap.docs.map((d) => d.id)));
    });
  }, [slug]);

  useEffect(() => {
    return onSnapshot(collection(db, 'timeouts'), (snap) => {
      const now = Date.now();
      const active = new Set<string>();
      snap.docs.forEach((d) => {
        const data = d.data();
        const expMs = (data.expiresAt as Timestamp | null | undefined)?.toMillis?.() ?? null;
        if (expMs === null || expMs > now) active.add(d.id);
      });
      setTimedOutUids(active);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!participants) return [];
    const q = search.trim().toLowerCase();
    return participants
      .filter((p) => {
        if (filter === 'muted') return mutedUids.has(p.uid);
        if (filter === 'timed-out') return timedOutUids.has(p.uid);
        return true;
      })
      .filter(
        (p) =>
          !q || p.username.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const at = a.lastActiveAt?.toMillis?.() ?? 0;
        const bt = b.lastActiveAt?.toMillis?.() ?? 0;
        return bt - at;
      });
  }, [participants, search, filter, mutedUids, timedOutUids]);

  async function toggleMute(p: Participant) {
    if (!user || !profile) return;
    const isMuted = mutedUids.has(p.uid);
    const verb = isMuted ? 'Unmute' : 'Mute';
    if (!confirm(`${verb} @${p.username} in this forum?`)) return;
    try {
      if (isMuted) {
        await unmuteUser(slug!, p.uid);
        logActivity(slug!, user.uid, profile.username, 'user_unmuted', {
          targetType: 'user',
          targetId: p.uid,
          details: p.username,
        });
      } else {
        await muteUser(slug!, p.uid, user.uid);
        logActivity(slug!, user.uid, profile.username, 'user_muted', {
          targetType: 'user',
          targetId: p.uid,
          details: p.username,
        });
      }
    } catch (err) {
      console.error('[mod:toggle-mute] failed:', err);
    }
  }

  async function toggleTimeout(p: Participant) {
    if (!user || !profile) return;
    const isTimedOut = timedOutUids.has(p.uid);
    const verb = isTimedOut ? 'Lift timeout for' : 'Timeout';
    if (!confirm(`${verb} @${p.username} (this is GLOBAL — affects every forum).`)) return;
    try {
      if (isTimedOut) {
        await liftTimeout(p.uid);
      } else {
        await timeoutUser(p.uid, user.uid, profile.username);
        logActivity(slug!, user.uid, profile.username, 'user_timed_out', {
          targetType: 'user',
          targetId: p.uid,
          details: p.username,
        });
      }
    } catch (err) {
      console.error('[mod:toggle-timeout] failed:', err);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Users</Text>
      <Text style={styles.sub}>Anyone who's posted or commented in this forum.</Text>

      <FormInput placeholder="Search by username or display name…" value={search} onChangeText={setSearch} />

      <View style={styles.filterRow}>
        {(['all', 'muted', 'timed-out'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === 'all' ? 'All' : f === 'muted' ? 'Muted' : 'Timed out'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {participants === null ? (
        <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 24 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>No matching users.</Text>
      ) : (
        filtered.map((p) => {
          const isMuted = mutedUids.has(p.uid);
          const isTimedOut = timedOutUids.has(p.uid);
          const isAdmin = isAdminUsername(p.username);
          return (
            <View key={p.uid} style={styles.card}>
              <View style={styles.cardLeft}>
                <Avatar size={40} label={p.displayName || p.username} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.displayName} onPress={() => router.push(`/profile/${p.username}`)}>
                      {p.displayName}
                    </Text>
                    <UserRoleTags username={p.username} />
                  </View>
                  <Text style={styles.username}>@{p.username}</Text>
                  <View style={styles.tagRow}>
                    {isMuted && <Text style={[styles.tag, styles.tagMuted]}>MUTED</Text>}
                    {isTimedOut && <Text style={[styles.tag, styles.tagTimeout]}>TIMED OUT</Text>}
                    <Text style={styles.stats}>
                      {p.postCount ?? 0} posts · {p.commentCount ?? 0} comments
                      {p.lastActiveAt ? ` · last active ${timeAgo(p.lastActiveAt)}` : ''}
                    </Text>
                  </View>
                </View>
              </View>
              {/* Mods cannot act on admins. */}
              {!isAdmin && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actBtn, isMuted && styles.actBtnActive]}
                    onPress={() => toggleMute(p)}
                  >
                    <Text style={[styles.actBtnLabel, isMuted && styles.actBtnLabelActive]}>
                      {isMuted ? 'Unmute' : 'Mute'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actBtn, styles.actBtnDestructive, isTimedOut && styles.actBtnActive]}
                    onPress={() => toggleTimeout(p)}
                  >
                    <Text style={[styles.actBtnLabel, styles.actBtnLabelDestructive]}>
                      {isTimedOut ? 'Lift timeout' : 'Timeout'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 24, marginBottom: 4 },
  sub: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  chipText: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  chipTextActive: { color: '#000', fontWeight: '700' },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginTop: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  displayName: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, fontWeight: '700' },
  username: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 4 },
  tag: {
    fontSize: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    fontFamily: BODY_FONT,
    fontWeight: '700',
    overflow: 'hidden',
  },
  tagMuted: { backgroundColor: 'rgba(255,170,85,0.2)', color: '#ffaa55' },
  tagTimeout: { backgroundColor: 'rgba(255,118,118,0.18)', color: COLORS.error },
  stats: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11 },
  actions: { flexDirection: 'column', gap: 6 },
  actBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    minWidth: 100,
    alignItems: 'center',
  },
  actBtnActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  actBtnDestructive: { borderColor: COLORS.error },
  actBtnLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  actBtnLabelActive: { color: '#000', fontWeight: '700' },
  actBtnLabelDestructive: { color: COLORS.error },
});

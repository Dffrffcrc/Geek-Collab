import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { useUserProfile } from '../../../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { banUser, liftBan, promptModerationReason } from '../../../lib/admin-tools';
import { isAdminUsername } from '../../../lib/admins';
import { Avatar } from '../../../components/Avatar';
import { FormInput } from '../../../components/FormInput';
import { RoleTag } from '../../../components/RoleTag';

type UserRow = {
  uid: string;
  username: string;
  displayName: string;
  email?: string;
};

type ForumLite = {
  slug: string;
  name: string;
  moderatorUids: string[];
};

type Filter = 'all' | 'banned' | 'mods';

export default function AdminUsers() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const { user: me } = useAuth();
  const profile = useUserProfile();

  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [bannedUids, setBannedUids] = useState<Set<string>>(new Set());
  const [forums, setForums] = useState<ForumLite[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(
        snap.docs
          .map((d) => ({
            uid: d.id,
            username: (d.data().username ?? '').trim(),
            displayName: (d.data().displayName ?? '').trim(),
            email: d.data().email,
          }))
          .filter((u) => u.username !== ''),
      );
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'timeouts'), (snap) => {
      const now = Date.now();
      const active = new Set<string>();
      snap.docs.forEach((d) => {
        const data = d.data();
        const expMs = (data.expiresAt as Timestamp | null | undefined)?.toMillis?.() ?? null;
        if (expMs === null || expMs > now) active.add(d.id);
      });
      setBannedUids(active);
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'forums'), (snap) => {
      setForums(
        snap.docs.map((d) => ({
          slug: d.id,
          name: (d.data().name as string) ?? d.id,
          moderatorUids: (d.data().moderatorUids as string[]) ?? [],
        })),
      );
    });
  }, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => {
        if (filter === 'banned') return bannedUids.has(u.uid);
        if (filter === 'mods')
          return forums.some((f) => f.moderatorUids.includes(u.uid));
        // 'all' excludes banned users — they live exclusively in the Banned tab.
        return !bannedUids.has(u.uid);
      })
      .filter(
        (u) =>
          !q ||
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [users, search, filter, bannedUids, forums]);

  async function toggleBan(u: UserRow) {
    if (!me || !profile) return;
    const isBanned = bannedUids.has(u.uid);
    if (isBanned) {
      if (!confirm(`Lift ban for @${u.username}?`)) return;
      try {
        await liftBan(u.uid);
      } catch (err) {
        console.error('[admin:users:ban] failed:', err);
      }
      return;
    }
    const reason = promptModerationReason('Ban', u.username);
    if (!reason) return;
    try {
      await banUser(u.uid, me.uid, profile.username, reason);
    } catch (err) {
      console.error('[admin:users:ban] failed:', err);
    }
  }

  function modForumsFor(u: UserRow): string[] {
    return forums.filter((f) => f.moderatorUids.includes(u.uid)).map((f) => f.slug);
  }

  return (
    <ScrollView contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}>
      <Text style={[styles.heading, compact && styles.headingCompact]}>Users</Text>
      <Text style={styles.sub}>Manage every user's status, ban, and moderator assignments.</Text>

      <FormInput
        placeholder="Search by username, display name, or email…"
        value={search}
        onChangeText={setSearch}
      />

      <View style={[styles.filterRow, compact && styles.filterRowCompact]}>
        {(['all', 'banned', 'mods'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === 'all' ? 'All' : f === 'banned' ? 'Banned / timed out' : 'Moderators'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {users === null ? (
        <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 24 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>No matching users.</Text>
      ) : (
        filtered.map((u) => {
          const isBanned = bannedUids.has(u.uid);
          const isAdmin = isAdminUsername(u.username);
          const modOf = modForumsFor(u);
          return (
            <TouchableOpacity
              key={u.uid}
              style={[styles.card, compact && styles.cardCompact]}
              activeOpacity={0.85}
              onPress={() => router.push(`/profile/${u.username}`)}
            >
              <Avatar size={42} label={u.displayName || u.username} />
              <View style={styles.identity}>
                <View style={styles.nameRow}>
                  <Text style={styles.displayName} numberOfLines={1}>
                    {u.displayName || u.username}
                  </Text>
                  {isAdmin && <RoleTag role="ADMIN" />}
                  {isBanned && <Text style={[styles.tag, styles.tagBanned]}>BANNED</Text>}
                  {!isAdmin && modOf.length > 0 && (
                    <Text style={[styles.tag, styles.tagMod]}>MOD · {modOf.length}</Text>
                  )}
                </View>
                <Text style={styles.username} numberOfLines={1}>
                  @{u.username}
                  {u.email ? ` · ${u.email}` : ''}
                </Text>
              </View>
              <View style={[styles.actions, compact && styles.actionsCompact]}>
                {!isAdmin && (
                  <ActBtn
                    label={isBanned ? 'Lift ban' : 'Ban'}
                    destructive
                    onPress={() => toggleBan(u)}
                  />
                )}
                <ActBtn label="View" onPress={() => router.push(`/profile/${u.username}`)} />
              </View>
            </TouchableOpacity>
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
    <TouchableOpacity onPress={onPress} style={[styles.actBtn, destructive && styles.actBtnDestructive]}>
      <Text style={[styles.actBtnLabel, destructive && styles.actBtnLabelDestructive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64 },
  scrollCompact: { padding: 16, paddingBottom: 36 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 24, marginBottom: 4 },
  headingCompact: { fontSize: 20 },
  sub: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginVertical: 8, flexWrap: 'wrap' },
  filterRowCompact: { marginTop: 2 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16,
    backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  chipText: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  chipTextActive: { color: '#000', fontWeight: '700' },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginTop: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
    marginBottom: 8, gap: 14,
  },
  cardCompact: { flexDirection: 'column', alignItems: 'flex-start' },
  identity: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 0 },
  displayName: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, fontWeight: '700' },
  username: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 12, marginTop: 2 },
  tag: {
    marginLeft: 6,
    fontSize: 9, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
    fontFamily: BODY_FONT, fontWeight: '700', overflow: 'hidden',
    letterSpacing: 0.4,
  },
  tagBanned: {
    backgroundColor: COLORS.warnBg,
    color: COLORS.warn,
    borderWidth: 1,
    borderColor: COLORS.warnBorder,
  },
  tagMod: {
    backgroundColor: 'rgba(239,235,69,0.18)', color: COLORS.yellow,
    borderWidth: 1, borderColor: 'rgba(239,235,69,0.5)',
  },
  actions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  actionsCompact: { alignSelf: 'stretch', flexWrap: 'wrap' },
  actBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: '#3a3a3a',
    alignItems: 'center',
  },
  actBtnDestructive: { borderColor: COLORS.error },
  actBtnLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  actBtnLabelDestructive: { color: COLORS.error },
});

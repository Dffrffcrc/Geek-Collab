import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { useUserProfile } from '../../../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { addModerator, banUser, liftBan, removeModerator } from '../../../lib/admin-tools';
import { logActivity } from '../../../lib/moderation';
import { Avatar } from '../../../components/Avatar';
import { FormInput } from '../../../components/FormInput';
import { XIcon } from '../../../components/Icons';

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
  const { user: me } = useAuth();
  const profile = useUserProfile();

  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [bannedUids, setBannedUids] = useState<Set<string>>(new Set());
  const [forums, setForums] = useState<ForumLite[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [modPickerFor, setModPickerFor] = useState<UserRow | null>(null);

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
        return true;
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
    if (!confirm(`${isBanned ? 'Lift ban for' : 'Ban'} @${u.username}?`)) return;
    try {
      if (isBanned) await liftBan(u.uid);
      else {
        await banUser(u.uid, me.uid, profile.username);
      }
    } catch (err) {
      console.error('[admin:users:ban] failed:', err);
    }
  }

  function modForumsFor(u: UserRow): string[] {
    return forums.filter((f) => f.moderatorUids.includes(u.uid)).map((f) => f.slug);
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Users</Text>
      <Text style={styles.sub}>Manage every user's status, ban, and moderator assignments.</Text>

      <FormInput
        placeholder="Search by username, display name, or email…"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterRow}>
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
          const modOf = modForumsFor(u);
          return (
            <View key={u.uid} style={styles.card}>
              <View style={styles.cardLeft}>
                <Avatar size={40} label={u.displayName || u.username} />
                <View style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
                  <Text style={styles.displayName} onPress={() => router.push(`/user/${u.username}`)}>
                    {u.displayName || u.username}
                  </Text>
                  <Text style={styles.username}>@{u.username}</Text>
                  <View style={styles.tagRow}>
                    {isBanned && <Text style={[styles.tag, styles.tagBanned]}>BANNED</Text>}
                    {modOf.length > 0 && (
                      <Text style={[styles.tag, styles.tagMod]}>MOD · {modOf.length}</Text>
                    )}
                    {u.email && <Text style={styles.email}>{u.email}</Text>}
                  </View>
                </View>
              </View>
              <View style={styles.actions}>
                <ActBtn label="View profile" onPress={() => router.push(`/user/${u.username}`)} />
                <ActBtn
                  label={isBanned ? 'Lift ban' : 'Ban'}
                  destructive
                  onPress={() => toggleBan(u)}
                />
                <ActBtn label="Mod assignments" onPress={() => setModPickerFor(u)} />
              </View>
            </View>
          );
        })
      )}

      {/* Per-user mod assignments modal */}
      <Modal
        visible={modPickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModPickerFor(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Mod assignments · @{modPickerFor?.username}
              </Text>
              <TouchableOpacity onPress={() => setModPickerFor(null)}>
                <XIcon size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            {modPickerFor && (
              <ModAssignments
                forums={forums}
                userUid={modPickerFor.uid}
                username={modPickerFor.username}
                actor={me?.uid}
                actorUsername={profile?.username}
                onClose={() => setModPickerFor(null)}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ModAssignments({
  forums,
  userUid,
  username,
  actor,
  actorUsername,
  onClose,
}: {
  forums: ForumLite[];
  userUid: string;
  username: string;
  actor: string | undefined;
  actorUsername: string | undefined;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(forum: ForumLite) {
    if (!actor || !actorUsername) return;
    const isMod = forum.moderatorUids.includes(userUid);
    setBusy(forum.slug);
    try {
      if (isMod) await removeModerator(forum.slug, userUid);
      else await addModerator(forum.slug, userUid);
      logActivity(forum.slug, actor, actorUsername, isMod ? 'user_unmuted' : 'user_muted', {
        targetType: 'user',
        targetId: userUid,
        details: `${username} ${isMod ? 'removed as mod' : 'added as mod'}`,
      });
    } catch (err) {
      console.error('[admin:users:mod-toggle] failed:', err);
    } finally {
      setBusy(null);
    }
  }

  if (forums.length === 0) {
    return <Text style={styles.empty}>No forums yet.</Text>;
  }

  return (
    <ScrollView style={{ maxHeight: 400 }}>
      {forums.map((f) => {
        const isMod = f.moderatorUids.includes(userUid);
        return (
          <View key={f.slug} style={styles.modRow}>
            <Text style={styles.modName} numberOfLines={1}>
              {f.name}
            </Text>
            <TouchableOpacity
              style={[styles.modBtn, isMod && styles.modBtnActive]}
              onPress={() => toggle(f)}
              disabled={busy === f.slug}
            >
              <Text style={[styles.modBtnLabel, isMod && styles.modBtnLabelActive]}>
                {busy === f.slug ? '…' : isMod ? 'Remove' : 'Make mod'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
      <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { alignSelf: 'flex-end', marginTop: 12 }]}>
        <Text style={styles.cancelLabel}>Done</Text>
      </TouchableOpacity>
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
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 24, marginBottom: 4 },
  sub: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
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
    borderRadius: 12, padding: 14, marginBottom: 10, gap: 12,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  displayName: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, fontWeight: '700' },
  username: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 4 },
  tag: {
    fontSize: 9, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
    fontFamily: BODY_FONT, fontWeight: '700', overflow: 'hidden',
  },
  tagBanned: { backgroundColor: 'rgba(255,118,118,0.18)', color: COLORS.error },
  tagMod: { backgroundColor: 'rgba(239,235,69,0.18)', color: COLORS.yellow },
  email: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11 },
  actions: { flexDirection: 'column', gap: 6 },
  actBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: '#3a3a3a',
    minWidth: 130, alignItems: 'center',
  },
  actBtnDestructive: { borderColor: COLORS.error },
  actBtnLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  actBtnLabelDestructive: { color: COLORS.error },

  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center',
    alignItems: 'center', padding: 24,
  },
  modal: {
    backgroundColor: '#2a2a2a', borderRadius: 14, padding: 22,
    width: '100%', maxWidth: 560, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18, flex: 1, paddingRight: 12 },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border },
  cancelLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14 },

  modRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1f1f1f', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
    marginBottom: 6,
  },
  modName: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, flex: 1, paddingRight: 8 },
  modBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#2a2a2a',
  },
  modBtnActive: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  modBtnLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  modBtnLabelActive: { color: '#fff', fontWeight: '700' },
});

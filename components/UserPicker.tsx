import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLORS, BODY_FONT } from '../lib/theme';
import { FormInput } from './FormInput';
import { Avatar } from './Avatar';

export type PickableUser = {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string | null;
};

export function UserPicker({
  selected,
  onChange,
  excludeUids = [],
  emptyHint = 'No users found.',
}: {
  selected: string[];
  onChange: (uids: string[]) => void;
  excludeUids?: string[];
  emptyHint?: string;
}) {
  const [users, setUsers] = useState<PickableUser[] | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(
          snap.docs
            .map((d) => ({
              uid: d.id,
              username: (d.data().username ?? '').trim(),
              displayName: (d.data().displayName ?? '').trim(),
              photoURL: (d.data().photoURL ?? null) as string | null,
            }))
            // Skip docs missing core fields (orphaned from abandoned signups).
            .filter((u) => u.username !== ''),
        );
      } catch (err) {
        console.warn('[user-picker] load failed:', err);
        setUsers([]);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => !excludeUids.includes(u.uid))
      .filter(
        (u) =>
          !q ||
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q),
      )
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [users, search, excludeUids]);

  function toggle(uid: string) {
    if (selected.includes(uid)) onChange(selected.filter((u) => u !== uid));
    else onChange([...selected, uid]);
  }

  if (users === null) {
    return <ActivityIndicator color={COLORS.yellow} style={{ marginVertical: 24 }} />;
  }

  return (
    <View>
      <FormInput placeholder="Search users…" value={search} onChangeText={setSearch} />

      {selected.length > 0 && (
        <View style={styles.chips}>
          {selected.map((uid) => {
            const u = users.find((x) => x.uid === uid);
            if (!u) return null;
            return (
              <TouchableOpacity key={uid} style={styles.chip} onPress={() => toggle(uid)}>
                <Text style={styles.chipText}>{u.username}</Text>
                <Text style={styles.chipX}>×</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView style={styles.list} contentContainerStyle={{ paddingVertical: 4 }}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>{emptyHint}</Text>
        ) : (
          filtered.map((u) => {
            const checked = selected.includes(u.uid);
            return (
              <TouchableOpacity
                key={u.uid}
                style={[styles.row, checked && styles.rowChecked]}
                onPress={() => toggle(u.uid)}
                activeOpacity={0.85}
              >
                <Avatar size={32} label={u.displayName || u.username} photoURL={u.photoURL} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.displayName} numberOfLines={1}>
                    {u.displayName || u.username}
                  </Text>
                  <Text style={styles.username} numberOfLines={1}>
                    @{u.username}
                  </Text>
                </View>
                <View style={[styles.box, checked && styles.boxChecked]}>
                  {checked && <Text style={styles.tick}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 260,
    backgroundColor: '#1f1f1f',
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, padding: 16, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  rowChecked: { backgroundColor: '#2a2a2a' },
  displayName: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, fontWeight: '600' },
  username: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxChecked: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  tick: { color: '#000', fontWeight: '900', fontSize: 14, lineHeight: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: { color: '#000', fontFamily: BODY_FONT, fontSize: 12, fontWeight: '700' },
  chipX: { color: '#000', fontWeight: '900', fontSize: 14, lineHeight: 14 },
});

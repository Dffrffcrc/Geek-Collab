import { Text, StyleSheet, View } from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';
import { isAdminUsername } from '../lib/admins';

export type Role = 'AUTHOR' | 'ADMIN' | 'MOD';

// Single pill — solid yellow for AUTHOR/ADMIN, soft yellow border for MOD.
export function RoleTag({ role }: { role: Role }) {
  if (role === 'MOD') {
    return <Text style={[styles.tag, styles.modTag]}>MOD</Text>;
  }
  return <Text style={[styles.tag, styles.solidTag]}>{role}</Text>;
}

// Convenience: render AUTHOR / ADMIN / MOD pills for a target user according
// to the rules of the app.
//
//   • AUTHOR — pass `isAuthor` (only meaningful inside a post's comment thread)
//   • ADMIN  — username is in the global admin allowlist (visible app-wide)
//   • MOD    — uid is in the current forum's moderatorUids (and they are NOT
//              an admin — admins are mods of every forum implicitly, so we
//              never show MOD alongside ADMIN)
export function UserRoleTags({
  username,
  uid,
  moderatorUids = [],
  isAuthor = false,
}: {
  username?: string | null;
  uid?: string;
  moderatorUids?: string[];
  isAuthor?: boolean;
}) {
  const admin = isAdminUsername(username);
  const mod = !!uid && moderatorUids.includes(uid);
  return (
    <View style={styles.row}>
      {isAuthor && <RoleTag role="AUTHOR" />}
      {admin && <RoleTag role="ADMIN" />}
      {!admin && mod && <RoleTag role="MOD" />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  tag: {
    marginLeft: 6,
    fontSize: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    fontFamily: BODY_FONT,
    fontWeight: '700',
    letterSpacing: 0.4,
    overflow: 'hidden',
  },
  solidTag: {
    backgroundColor: COLORS.yellow,
    color: '#000',
  },
  modTag: {
    backgroundColor: 'rgba(239, 235, 69, 0.18)',
    color: COLORS.yellow,
    borderWidth: 1,
    borderColor: 'rgba(239, 235, 69, 0.5)',
  },
});

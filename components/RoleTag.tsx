import { Text, StyleSheet, View } from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';
import { useAdmins } from '../lib/admins';

export type Role = 'ADMIN' | 'MOD';




export function RoleTag({ role }: { role: Role }) {
  return <Text style={styles.tag}>{role === 'ADMIN' ? ' (admin)' : ' (mod)'}</Text>;
}








export function UserRoleTags({ isAuthor = false }: { isAuthor?: boolean }) {
  if (!isAuthor) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.authorInline}> · author</Text>
    </View>
  );
}




export function useUserRole(
  username?: string | null,
  uid?: string,
  moderatorUids: string[] = [],
) {
  const { isAdminUsername } = useAdmins();
  const isAdmin = isAdminUsername(username);
  const isMod = !!uid && !isAdmin && moderatorUids.includes(uid);
  return {
    isAdmin,
    isMod,


    nameColor: isAdmin || isMod ? COLORS.yellow : undefined,
  };
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  authorInline: {
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    fontSize: 11,
    fontWeight: '600',
  },



  tag: {
    color: COLORS.yellow,
    fontWeight: '600',
  },
});

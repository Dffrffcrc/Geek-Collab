import { Text, StyleSheet, View } from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';
import { useAdmins } from '../lib/admins';

export type Role = 'ADMIN' | 'MOD';

// Renders a lowercase "(admin)" or "(mod)" tag in yellow. Meant to sit
// inline right after a display name (see UserRoleTags below for the usual
// wrapper that decides which role tag — if any — applies to a given user).
export function RoleTag({ role }: { role: Role }) {
  return <Text style={styles.tag}>{role === 'ADMIN' ? ' (admin)' : ' (mod)'}</Text>;
}

// Renders the Instagram-style "· author" text on comments authored by the
// post author. Role tags themselves are rendered inline inside the
// @username Text at each call site via <RoleTag>, so they inherit that
// row's font size — pass those props to <RoleTag>, not here.
//
// Kept as a component (rather than plain text) so callers can drop it in
// without a conditional wrapper.
export function UserRoleTags({ isAuthor = false }: { isAuthor?: boolean }) {
  if (!isAuthor) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.authorInline}> · author</Text>
    </View>
  );
}

// Hook for callers that need to know whether a user is admin/mod so they
// can style adjacent text (e.g. yellow display name). Returns a stable
// object per render.
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
    // Convenience: the display-name colour to apply. Yellow for admin+mod,
    // undefined otherwise so callers can fall back to their own default.
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
  // Deliberately no fontSize / fontFamily — the tag is meant to be nested
  // inside a parent Text (e.g. the @username line) so it inherits size and
  // family from the surrounding text, staying visually inline.
  tag: {
    color: COLORS.yellow,
    fontWeight: '600',
  },
});

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Timestamp } from 'firebase/firestore';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { timeRemaining } from '../lib/forum-utils';

export type ForumSummary = {
  slug: string;
  name: string;
  description: string;
  closesAt: Timestamp;
};

export function ForumRow({
  forum,
  closed,
  onPress,
}: {
  forum: ForumSummary;
  closed?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, closed && styles.cardClosed]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{forum.name}</Text>
        <Text style={[styles.badge, closed ? styles.badgeClosed : styles.badgeActive]}>
          {closed ? 'R/O' : timeRemaining(forum.closesAt)}
        </Text>
      </View>
      {!!forum.description && <Text style={styles.description}>{forum.description}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#2a2a2a', borderRadius: 14, padding: 18, marginBottom: 12 },
  cardClosed: { opacity: 0.7 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 20 },
  description: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginTop: 6 },
  badge: {
    fontFamily: BODY_FONT,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  badgeActive: { backgroundColor: COLORS.yellow, color: '#000' },
  badgeClosed: { backgroundColor: '#444', color: COLORS.textMuted },
});

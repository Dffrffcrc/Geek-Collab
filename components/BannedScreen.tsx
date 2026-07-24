import { View, Text, StyleSheet } from 'react-native';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';

export function BannedScreen({
  reason,
  expiresAt,
}: {
  reason?: string;
  expiresAt?: Date | null;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.heading}>You are banned</Text>
        <Text style={styles.subheading}>
          {expiresAt
            ? 'Your account is temporarily suspended from forum.geekshacking.'
            : 'Your account has been permanently banned from forum.geekshacking. You cannot access any part of this app.'}
        </Text>

        {reason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>REASON</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        )}

        {expiresAt && (
          <Text style={styles.expiresText}>
            Your suspension ends {expiresAt.toLocaleString()}.
          </Text>
        )}

        <Text style={styles.appealHint}>
          Believe this is a mistake? Contact the site admin — the ban stays in place until
          they lift it.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    maxWidth: 520,
    width: '100%',
    padding: 32,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.bgPanel,
  },
  heading: {
    color: COLORS.error,
    fontFamily: HEADING_FONT,
    fontSize: 26,
    marginBottom: 8,
  },
  subheading: {
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  reasonBox: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.warnBorder,
    backgroundColor: COLORS.warnBg,
    marginBottom: 16,
  },
  reasonLabel: {
    color: COLORS.warn,
    fontFamily: BODY_FONT,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  reasonText: {
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
    fontSize: 13,
    lineHeight: 18,
  },
  expiresText: {
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    fontSize: 12,
    marginBottom: 20,
  },
  appealHint: {
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});

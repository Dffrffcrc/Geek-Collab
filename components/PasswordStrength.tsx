import { View, Text, StyleSheet } from 'react-native';
import { FONT } from '../lib/theme';

export function passwordScore(p: string): number {
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  return Math.min(score, 4);
}

const LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const BAR_COLORS = ['transparent', '#ff7676', '#ffaa55', '#d8e840', '#efeb45'];

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = passwordScore(password);
  const color = BAR_COLORS[score];

  return (
    <View style={styles.wrapper}>
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[styles.bar, { backgroundColor: i <= score ? color : '#3a3a3a' }]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color }]}>{LABELS[score]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: -4, marginBottom: 12 },
  bars: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  label: { fontFamily: FONT, fontSize: 11, alignSelf: 'flex-end' },
});

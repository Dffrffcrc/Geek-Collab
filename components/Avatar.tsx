import { View, Text, StyleSheet } from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';

// Placeholder avatar — yellow user silhouette on dark circle, like the design.
// We can swap in real photo URLs later.
export function Avatar({
  size = 36,
  label,
}: {
  size?: number;
  label?: string | null;
}) {
  const initial = (label ?? '').trim().slice(0, 1).toUpperCase();
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.45 }]}>{initial || '•'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.bgDark,
  },
  initial: { color: COLORS.yellow, fontFamily: BODY_FONT, fontWeight: '700' },
});

import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';

export function Avatar({
  size = 36,
  label,
  photoURL,
}: {
  size?: number;
  label?: string | null;
  photoURL?: string | null;
}) {
  const initial = (label ?? '').trim().slice(0, 1).toUpperCase();
  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[
          styles.circle,
          styles.photo,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    );
  }
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
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
  photo: {
    backgroundColor: '#3a3a3a',
  },
  initial: { color: COLORS.yellow, fontFamily: BODY_FONT, fontWeight: '700' },
});

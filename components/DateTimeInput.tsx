import { Platform, StyleSheet, TextInput } from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';

// react-native-web passes through unknown JSX intrinsic elements to the DOM,
// so on web we render a plain <input type="datetime-local"> for the OS-native
// picker. On mobile we fall back to a plain text input (we'll swap in a real
// native picker when we add mobile support).
export function DateTimeInput({
  value,
  onChange,
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
}) {
  if (Platform.OS === 'web') {
    return (
      // @ts-expect-error JSX <input> is fine in react-native-web
      <input
        type="datetime-local"
        value={value}
        min={min}
        onChange={(e: { target: { value: string } }) => onChange(e.target.value)}
        style={webStyle}
      />
    );
  }
  return (
    <TextInput
      placeholder="YYYY-MM-DD HH:mm"
      placeholderTextColor={COLORS.textPlaceholder}
      value={value}
      onChangeText={onChange}
      style={styles.input}
    />
  );
}

const webStyle = {
  height: 48,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderStyle: 'solid' as const,
  borderRadius: 24,
  paddingLeft: 18,
  paddingRight: 18,
  color: COLORS.textPrimary,
  backgroundColor: 'transparent',
  marginBottom: 14,
  fontSize: 15,
  fontFamily: BODY_FONT,
  outline: 'none',
  colorScheme: 'dark' as const,
  width: '100%' as const,
};

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    paddingHorizontal: 18,
    color: COLORS.textPrimary,
    marginBottom: 14,
    fontSize: 15,
    fontFamily: BODY_FONT,
  },
});

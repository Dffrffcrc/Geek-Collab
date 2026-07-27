import { TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { COLORS, FONT } from '../lib/theme';

export function FormInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={COLORS.textPlaceholder}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    paddingHorizontal: 18,
    color: COLORS.textPrimary,
    backgroundColor: 'transparent',
    marginBottom: 14,
    fontSize: 15,
    fontFamily: FONT,

    // @ts-expect-error web-only style
    outlineStyle: 'none',
  },
});

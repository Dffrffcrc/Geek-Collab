import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../lib/theme';

export default function Settings() {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Settings</Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>Coming soon</Text>
        <Text style={styles.placeholderBody}>
          Theme, accessibility, notifications, and account preferences will live here. We'll wire
          these up in a later pass.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64, maxWidth: 720 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 32, marginBottom: 24 },
  placeholder: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 22 },
  placeholderTitle: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 18, marginBottom: 8 },
  placeholderBody: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, lineHeight: 20 },
});

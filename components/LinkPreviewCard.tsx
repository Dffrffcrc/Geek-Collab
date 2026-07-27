import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';
import { faviconFor, hostnameFor, pathSummaryFor } from '../lib/link-previews';




export function LinkPreviewCard({
  url,
  onPress,
}: {
  url: string;
  onPress?: () => void;
}) {
  const host = hostnameFor(url);
  const path = pathSummaryFor(url);
  const favicon = faviconFor(url);

  function handlePress() {
    if (onPress) onPress();
    else Linking.openURL(url).catch(() => undefined);
  }

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.85}>
      <Image source={{ uri: favicon }} style={styles.favicon} />
      <View style={styles.meta}>
        <Text style={styles.host} numberOfLines={1}>{host}</Text>
        <Text style={styles.path} numberOfLines={1}>{path}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.separator,
    backgroundColor: COLORS.bgPanel,
  },
  favicon: { width: 24, height: 24, borderRadius: 4, backgroundColor: COLORS.bgDark },
  meta: { flex: 1, minWidth: 0 },
  host: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, fontWeight: '700' },
  path: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginTop: 2 },
  chevron: { color: COLORS.textMuted, fontSize: 22, fontFamily: BODY_FONT, lineHeight: 22 },
});

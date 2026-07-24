import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';
import { formatSize, type Attachment } from '../lib/uploads';

export function AttachmentStrip({
  attachments,
  size = 'normal',
}: {
  attachments: Attachment[] | undefined | null;
  size?: 'normal' | 'small';
}) {
  if (!attachments || attachments.length === 0) return null;
  const isSmall = size === 'small';
  return (
    <View style={[styles.wrap, isSmall && styles.wrapSmall]}>
      {attachments.map((att) => (
        <AttachmentTile key={att.path} attachment={att} small={isSmall} />
      ))}
    </View>
  );
}

function AttachmentTile({
  attachment,
  small,
}: {
  attachment: Attachment;
  small: boolean;
}) {
  const open = () => Linking.openURL(attachment.url).catch(() => undefined);

  if (attachment.kind === 'image') {
    const dimension = small ? 96 : 160;
    return (
      <TouchableOpacity onPress={open} activeOpacity={0.85}>
        <Image
          source={{ uri: attachment.url }}
          style={[styles.thumb, { width: dimension, height: dimension }]}
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={open} activeOpacity={0.85} style={[styles.fileCard, small && styles.fileCardSmall]}>
      <View style={styles.fileBadge}>
        <Text style={styles.fileBadgeText}>
          {attachment.kind === 'pdf' ? 'PDF' : attachment.kind === 'pptx' ? 'PPT' : 'FILE'}
        </Text>
      </View>
      <View style={styles.fileMeta}>
        <Text style={[styles.fileName, small && styles.fileNameSmall]} numberOfLines={1}>
          {attachment.name}
        </Text>
        <Text style={styles.fileSize}>{formatSize(attachment.size)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  wrapSmall: { gap: 8, marginTop: 8 },
  thumb: {
    borderRadius: 6,
    backgroundColor: COLORS.bgPanel,
    borderWidth: 1,
    borderColor: COLORS.separator,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.separator,
    backgroundColor: COLORS.bgPanel,
    minWidth: 220,
    maxWidth: 320,
  },
  fileCardSmall: { paddingVertical: 6, paddingHorizontal: 10, minWidth: 180 },
  fileBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.yellow,
  },
  fileBadgeText: {
    color: COLORS.yellow,
    fontFamily: BODY_FONT,
    fontSize: 10,
    fontWeight: '700',
  },
  fileMeta: { flex: 1, minWidth: 0 },
  fileName: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13 },
  fileNameSmall: { fontSize: 12 },
  fileSize: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginTop: 2 },
});

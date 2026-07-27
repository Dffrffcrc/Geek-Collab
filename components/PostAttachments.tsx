import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';
import { formatSize, type Attachment } from '../lib/uploads';
import { ImageCarousel } from './ImageCarousel';
import { LinkPreviewCard } from './LinkPreviewCard';
import { extractUrls } from '../lib/link-previews';










export function PostAttachments({
  attachments,
  body,
  mode = 'post',
  size = 'normal',
  onNavigate,
}: {
  attachments?: Attachment[] | null;
  body?: string | null;
  mode?: 'post' | 'card';



  size?: 'small' | 'normal';


  onNavigate?: () => void;
}) {
  const list = attachments ?? [];
  const images = list.filter((a) => a.kind === 'image');
  const files = list.filter((a) => a.kind !== 'image');
  const urls = useMemo(() => extractUrls(body ?? ''), [body]);

  if (images.length === 0 && files.length === 0 && urls.length === 0) return null;

  const imageUrls = images.map((a) => a.url);
  const carouselMax =
    mode === 'card' ? 200 : size === 'small' ? 200 : 480;

  return (
    <View style={styles.root}>
      {imageUrls.length > 0 && (
        <ImageCarousel
          urls={imageUrls}
          maxHeight={carouselMax}
          onImagePress={
            mode === 'card'
              ? () => onNavigate?.()
              : undefined
          }
        />
      )}

      {files.length > 0 && (
        <View style={styles.files}>
          {files.map((f) => (
            <FileCard key={f.path} attachment={f} mode={mode} onNavigate={onNavigate} />
          ))}
        </View>
      )}

      {urls.length > 0 && (
        <View style={styles.links}>
          {urls.map((u) => (
            <LinkPreviewCard
              key={u}
              url={u}
              onPress={mode === 'card' ? onNavigate : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
}



function FileCard({
  attachment,
  mode,
  onNavigate,
}: {
  attachment: Attachment;
  mode: 'post' | 'card';
  onNavigate?: () => void;
}) {
  const label =
    attachment.kind === 'pdf' ? 'PDF' : attachment.kind === 'pptx' ? 'PPT' : 'FILE';

  function handlePress() {
    if (mode === 'card') {
      onNavigate?.();
      return;
    }
    Linking.openURL(attachment.url).catch(() => undefined);
  }

  return (
    <TouchableOpacity style={styles.fileCard} onPress={handlePress} activeOpacity={0.85}>
      <View style={styles.fileBadge}>
        <Text style={styles.fileBadgeText}>{label}</Text>
      </View>
      <View style={styles.fileMeta}>
        <Text style={styles.fileName} numberOfLines={2}>{attachment.name}</Text>
        <Text style={styles.fileSize}>
          {formatSize(attachment.size)} · {mode === 'card' ? 'Open post to view' : 'Click to open'}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}




export function FirstImageOnly({ url }: { url: string | undefined }) {
  if (!url) return null;
  return <Image source={{ uri: url }} style={styles.singleImage} resizeMode="cover" />;
}

const styles = StyleSheet.create({


  root: { width: '100%', alignSelf: 'stretch' },
  files: { marginTop: 12, gap: 8 },
  links: { marginTop: 12, gap: 8 },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.separator,
    backgroundColor: COLORS.bgPanel,
  },
  fileBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.yellow,
    minWidth: 52,
    alignItems: 'center',
  },
  fileBadgeText: {
    color: COLORS.yellow,
    fontFamily: BODY_FONT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fileMeta: { flex: 1, minWidth: 0 },
  fileName: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, lineHeight: 18 },
  fileSize: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginTop: 4 },
  chevron: { color: COLORS.textMuted, fontSize: 24, fontFamily: BODY_FONT, lineHeight: 24 },
  singleImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 12,
    backgroundColor: COLORS.bgDark,
  },
});

import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';
import { formatSize, type Attachment } from '../lib/uploads';
import { ImageCarousel } from './ImageCarousel';
import { LinkPreviewCard } from './LinkPreviewCard';
import { extractUrls } from '../lib/link-previews';

// The composite render for everything that attaches to a post: image carousel
// (or single image), non-image file cards (PDF/PPTX), and link-preview cards
// extracted from the post body.
//
// `mode`:
//   'post'  — inside the post-detail page. Taps open the resource directly.
//   'card'  — inside a PostCard on the forum list. Taps propagate up so the
//             parent card navigation still works, EXCEPT for carousel arrows /
//             dots which stop propagation so paging doesn't trigger nav.
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
  // Controls the carousel/file-card scale. 'small' is for comments; 'normal'
  // is for the post-detail view. Independent of `mode` (which controls tap
  // behaviour: card → navigate to post, post → open the resource directly).
  size?: 'small' | 'normal';
  // Called when a resource in the strip is tapped and we're in card mode —
  // typically navigate to the post detail page.
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
              : undefined /* undefined → default (open in new tab) */
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

// Larger, more inviting PDF/PPTX card than the flat strip version. Prominent
// badge + filename + size + "open" chevron so users are drawn to tap it.
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

// Simple wrapper of the first image only, used in the very-compact PostCard
// layout when we intentionally want to skip the carousel — kept as an export
// in case forum listings ever want that. Not used by PostAttachments itself.
export function FirstImageOnly({ url }: { url: string | undefined }) {
  if (!url) return null;
  return <Image source={{ uri: url }} style={styles.singleImage} resizeMode="cover" />;
}

const styles = StyleSheet.create({
  // Explicit width + stretch so the horizontal ScrollView inside
  // ImageCarousel doesn't get a zero-width parent on RN Web.
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

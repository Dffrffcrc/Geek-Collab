import { StyleSheet, Linking } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';

// Themed markdown renderer for post and comment bodies. CommonMark-compatible
// (bold, italic, lists, links, code, blockquote, headings). We deliberately
// disable images — media uploads are deferred and inline image markdown would
// pull arbitrary external assets.
export function MarkdownBody({
  children,
  size = 'normal',
}: {
  children: string;
  size?: 'normal' | 'small';
}) {
  const sheet = size === 'small' ? smallStyles : normalStyles;
  return (
    <Markdown
      style={sheet}
      onLinkPress={(url) => {
        Linking.openURL(url).catch(() => undefined);
        return false;
      }}
      rules={{
        // Strip images outright until we have a media host.
        image: () => null,
      }}
    >
      {children}
    </Markdown>
  );
}

const baseText = {
  color: COLORS.textPrimary,
  fontFamily: BODY_FONT,
};

const normalStyles = StyleSheet.create({
  body: { ...baseText, fontSize: 14, lineHeight: 22 },
  paragraph: { ...baseText, fontSize: 14, lineHeight: 22, marginTop: 0, marginBottom: 8 },
  heading1: { ...baseText, fontFamily: HEADING_FONT, fontSize: 22, marginBottom: 8, color: COLORS.textPrimary },
  heading2: { ...baseText, fontFamily: HEADING_FONT, fontSize: 19, marginBottom: 8, color: COLORS.textPrimary },
  heading3: { ...baseText, fontFamily: HEADING_FONT, fontSize: 16, marginBottom: 6, color: COLORS.textPrimary },
  heading4: { ...baseText, fontFamily: HEADING_FONT, fontSize: 15, marginBottom: 6, color: COLORS.textPrimary },
  heading5: { ...baseText, fontFamily: HEADING_FONT, fontSize: 14, marginBottom: 4, color: COLORS.textPrimary },
  heading6: { ...baseText, fontFamily: HEADING_FONT, fontSize: 13, marginBottom: 4, color: COLORS.textPrimary },
  strong: { ...baseText, fontWeight: '700' },
  em: { ...baseText, fontStyle: 'italic' },
  link: { color: COLORS.yellow, textDecorationLine: 'underline' },
  blockquote: {
    backgroundColor: '#1f1f1f',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.yellow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 6,
  },
  code_inline: {
    ...baseText,
    backgroundColor: '#1f1f1f',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    fontFamily: BODY_FONT,
    fontSize: 13,
  },
  code_block: {
    ...baseText,
    backgroundColor: '#1f1f1f',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: BODY_FONT,
  },
  fence: {
    ...baseText,
    backgroundColor: '#1f1f1f',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: BODY_FONT,
  },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { ...baseText, fontSize: 14, lineHeight: 22 },
  hr: { backgroundColor: COLORS.separator, height: 1, marginVertical: 12 },
});

const smallStyles = StyleSheet.create({
  body: { ...baseText, fontSize: 13, lineHeight: 18 },
  paragraph: { ...baseText, fontSize: 13, lineHeight: 18, marginTop: 0, marginBottom: 4 },
  heading1: { ...baseText, fontFamily: HEADING_FONT, fontSize: 16, marginBottom: 4 },
  heading2: { ...baseText, fontFamily: HEADING_FONT, fontSize: 15, marginBottom: 4 },
  heading3: { ...baseText, fontFamily: HEADING_FONT, fontSize: 14, marginBottom: 4 },
  heading4: { ...baseText, fontFamily: HEADING_FONT, fontSize: 13, marginBottom: 4 },
  heading5: { ...baseText, fontFamily: HEADING_FONT, fontSize: 13, marginBottom: 4 },
  heading6: { ...baseText, fontFamily: HEADING_FONT, fontSize: 13, marginBottom: 4 },
  strong: { ...baseText, fontWeight: '700' },
  em: { ...baseText, fontStyle: 'italic' },
  link: { color: COLORS.yellow, textDecorationLine: 'underline' },
  blockquote: {
    backgroundColor: '#1f1f1f',
    borderLeftWidth: 2,
    borderLeftColor: COLORS.yellow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginVertical: 4,
  },
  code_inline: {
    ...baseText,
    backgroundColor: '#1f1f1f',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    fontSize: 12,
  },
  code_block: {
    ...baseText,
    backgroundColor: '#1f1f1f',
    padding: 10,
    borderRadius: 6,
    fontSize: 12,
  },
  fence: {
    ...baseText,
    backgroundColor: '#1f1f1f',
    padding: 10,
    borderRadius: 6,
    fontSize: 12,
  },
  bullet_list: { marginVertical: 2 },
  ordered_list: { marginVertical: 2 },
  list_item: { ...baseText, fontSize: 13, lineHeight: 18 },
  hr: { backgroundColor: COLORS.separator, height: 1, marginVertical: 8 },
});

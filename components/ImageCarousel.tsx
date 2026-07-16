import { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';

// Reddit-style image carousel. One image visible at a time, snap to page,
// prev/next arrows for desktop, dots under the frame.
//
// Layout-stability notes (this file was rewritten to fix a bad regression):
//  * Height is set via CSS `aspectRatio` on the frame, NOT JS measurement.
//    The browser computes height the instant width is known, so nothing
//    reflows when our measurement state lands a frame later.
//  * Every wrapper has an explicit width. The previous version relied on
//    RN's implicit cross-axis stretch; in some nested-flex configurations
//    (PostCard → PostAttachments → View → wrap → frame) that collapsed to
//    zero width on web, hiding the frame and letting siblings pile up.
//  * Single-image case skips the ScrollView entirely. No measurement race,
//    no snap-interval, no chance of a horizontal-scroll ghost overflowing
//    the card. Most posts hit this path.

const ASPECT = 16 / 9;

export function ImageCarousel({
  urls,
  onImagePress,
  maxHeight = 360,
}: {
  urls: string[];
  onImagePress?: (url: string, index: number) => void;
  maxHeight?: number;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);

  if (urls.length === 0) return null;

  const single = urls.length === 1;

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 0.5) setWidth(w);
  }

  function open(url: string, i: number) {
    if (onImagePress) onImagePress(url, i);
    else Linking.openURL(url).catch(() => undefined);
  }

  function goTo(next: number) {
    const clamped = Math.max(0, Math.min(urls.length - 1, next));
    setIndex(clamped);
    if (width > 0) {
      scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    }
  }

  // Only commit index changes when scroll is close to a snap point. Rounding
  // the raw offset mid-drag causes the dots to flip-flop as the finger
  // crosses each page midpoint; that's what the "blinky and stuttery" bug
  // was. Tight neighborhood keeps them stable during motion and settles them
  // exactly once when the swipe lands.
  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width === 0) return;
    const raw = e.nativeEvent.contentOffset.x / width;
    const rounded = Math.round(raw);
    if (Math.abs(raw - rounded) < 0.15 && rounded !== index) {
      setIndex(rounded);
    }
  }

  // Belt-and-braces: when momentum ends we're definitively on a page, so
  // commit the exact index in case the fast-motion threshold above happened
  // to skip past a snap point without triggering an update.
  function onSettle(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width === 0) return;
    const rounded = Math.round(e.nativeEvent.contentOffset.x / width);
    if (rounded !== index) setIndex(rounded);
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.frame, { maxHeight }]} onLayout={onLayout}>
        {single ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => open(urls[0], 0)}
            style={styles.fill}
          >
            <Image source={{ uri: urls[0] }} style={styles.image} resizeMode="contain" />
          </TouchableOpacity>
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            onMomentumScrollEnd={onSettle}
            onScrollEndDrag={onSettle}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={width > 0 ? width : undefined}
            snapToAlignment="start"
            scrollEnabled={width > 0}
            style={styles.fill}
            contentContainerStyle={styles.scrollContent}
          >
            {urls.map((url, i) => (
              <TouchableOpacity
                key={url + i}
                activeOpacity={0.9}
                onPress={() => open(url, i)}
                style={[styles.slide, width > 0 ? { width } : styles.slideFallback]}
              >
                <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {!single && index > 0 && width > 0 && (
          <TouchableOpacity
            style={[styles.arrow, styles.arrowLeft]}
            onPress={() => goTo(index - 1)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
        )}
        {!single && index < urls.length - 1 && width > 0 && (
          <TouchableOpacity
            style={[styles.arrow, styles.arrowRight]}
            onPress={() => goTo(index + 1)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        )}

        {!single && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {index + 1} / {urls.length}
            </Text>
          </View>
        )}
      </View>

      {!single && (
        <View style={styles.dots}>
          {urls.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => goTo(i)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Explicit width + stretch so nested-flex quirks on RN Web don't collapse
    // this subtree. Was the root cause of the previous "cards are all over
    // the place" regression.
    width: '100%',
    alignSelf: 'stretch',
    marginTop: 12,
  },
  frame: {
    width: '100%',
    // Browser sets height from aspectRatio the instant width is known — no
    // JS measurement race, no layout shift after mount.
    aspectRatio: ASPECT,
    backgroundColor: COLORS.bgDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.separator,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: { width: '100%', height: '100%' },
  scrollContent: { flexDirection: 'row' },
  slide: { height: '100%' },
  // Fallback size while width measurement hasn't landed yet. Doesn't matter
  // visually — the frame is already sized via aspectRatio, so this only
  // affects the ScrollView's off-screen content sizing.
  slideFallback: { width: 1 },
  image: { width: '100%', height: '100%' },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowLeft: { left: 8 },
  arrowRight: { right: 8 },
  arrowText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
    fontFamily: BODY_FONT,
  },
  counter: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: { color: '#fff', fontFamily: BODY_FONT, fontSize: 11, fontWeight: '700' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.separator,
  },
  dotActive: { backgroundColor: COLORS.yellow },
});

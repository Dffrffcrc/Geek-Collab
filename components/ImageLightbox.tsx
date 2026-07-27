import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';
import { XIcon } from './Icons';









export function ImageLightbox({
  urls,
  startIndex,
  visible,
  onClose,
}: {
  urls: string[];
  startIndex: number;
  visible: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const { width: winW, height: winH } = useWindowDimensions();



  useEffect(() => {
    if (visible) setIndex(startIndex);
  }, [visible, startIndex]);


  useEffect(() => {
    if (!visible || typeof window === 'undefined') return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        setIndex((i) => Math.min(urls.length - 1, i + 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, urls.length, onClose]);

  if (urls.length === 0) return null;
  const current = urls[Math.max(0, Math.min(index, urls.length - 1))];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      // For web: ensure the modal doesn't bake in the page's font-family.
    >
      {/* Backdrop — tap anywhere except the image closes. */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Absorb taps on the image itself so users can zoom/interact
            without accidentally dismissing. */}
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: current }}
              style={{
                width: winW * 0.9,
                height: winH * 0.85,
              }}
              resizeMode="contain"
            />
          </View>
        </TouchableWithoutFeedback>

        {/* Close button — pinned top-right. */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Close image"
        >
          <XIcon size={22} color="#fff" />
        </TouchableOpacity>

        {/* Arrow controls + counter only when there's more than one. */}
        {urls.length > 1 && (
          <>
            {index > 0 && (
              <TouchableOpacity
                style={[styles.arrow, styles.arrowLeft]}
                onPress={(e) => {
                  e.stopPropagation();
                  setIndex(index - 1);
                }}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
            )}
            {index < urls.length - 1 && (
              <TouchableOpacity
                style={[styles.arrow, styles.arrowRight]}
                onPress={(e) => {
                  e.stopPropagation();
                  setIndex(index + 1);
                }}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            )}
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {index + 1} / {urls.length}
              </Text>
            </View>
          </>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrap: { justifyContent: 'center', alignItems: 'center' },
  closeBtn: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowLeft: { left: 24 },
  arrowRight: { right: 24 },
  arrowText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 32,
    fontFamily: BODY_FONT,
  },
  counter: {
    position: 'absolute',
    bottom: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  counterText: { color: '#fff', fontFamily: BODY_FONT, fontSize: 12, fontWeight: '700' },
});

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';

// Wraps a composer so users can paste an image from the clipboard or drop
// files anywhere inside. Both paths hand File[] to `onFiles`, which the
// caller pipes into `AttachmentPickerHandle.addFiles`. Shows a dashed
// overlay while a drag is over the zone so the drop target is obvious.
//
// Web-only. On native it renders as a passthrough — RN doesn't have a
// clipboard/drop model comparable to the DOM's, and this app is web-first.
export function DropZone({
  onFiles,
  children,
}: {
  onFiles: (files: File[]) => void;
  children: ReactNode;
}) {
  // `any` ref because RN Web's View accepts any host ref but the imported
  // View type doesn't formally expose the DOM element.
  const containerRef = useRef<any>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  // Track drag-enter/leave depth so nested children entering/leaving don't
  // flicker the overlay. Only the outermost leave clears it.
  const dragDepth = useRef(0);

  // Keep the callback fresh in a ref so the listeners don't have to be
  // re-bound on every render.
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = containerRef.current as HTMLElement | null;
    if (!el) return;

    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        // Only prevent default when we actually consume the paste — pastes
        // that are just text bubble through to the underlying input.
        e.preventDefault();
        onFilesRef.current(files);
      }
    }

    function handleDragEnter(e: DragEvent) {
      // Only care about drags that carry files.
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      dragDepth.current += 1;
      setIsDraggingOver(true);
    }

    function handleDragOver(e: DragEvent) {
      if (!e.dataTransfer?.types.includes('Files')) return;
      // preventDefault on dragover is what makes the drop actually fire.
      e.preventDefault();
    }

    function handleDragLeave(e: DragEvent) {
      if (!e.dataTransfer?.types.includes('Files')) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setIsDraggingOver(false);
    }

    function handleDrop(e: DragEvent) {
      if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;
      e.preventDefault();
      dragDepth.current = 0;
      setIsDraggingOver(false);
      onFilesRef.current(Array.from(e.dataTransfer.files));
    }

    el.addEventListener('paste', handlePaste);
    el.addEventListener('dragenter', handleDragEnter);
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('drop', handleDrop);
    return () => {
      el.removeEventListener('paste', handlePaste);
      el.removeEventListener('dragenter', handleDragEnter);
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('dragleave', handleDragLeave);
      el.removeEventListener('drop', handleDrop);
    };
  }, []);

  return (
    <View ref={containerRef} style={styles.wrap}>
      {children}
      {isDraggingOver && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.overlayLabel}>Drop to upload</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  overlay: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.yellow,
    backgroundColor: 'rgba(239, 235, 69, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayLabel: {
    color: COLORS.yellow,
    fontFamily: BODY_FONT,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

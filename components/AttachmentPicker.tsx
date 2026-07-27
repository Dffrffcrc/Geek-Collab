import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { ImageIcon, XIcon } from './Icons';
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
  deleteAttachment,
  formatSize,
  pickFiles,
  uploadFile,
  validateFile,
  type Attachment,
} from '../lib/uploads';
import { MAX_ATTACHMENTS_PER_ITEM } from '../lib/content-limits';

type PendingUpload = {
  key: string;
  file: File;
  progress: number;
  error?: string;
  attachment?: Attachment;
  cancel: () => void;
  previewUrl?: string;
};





export type AttachmentPickerHandle = {
  addFiles: (files: File[]) => void;
};






export const AttachmentPicker = forwardRef<
  AttachmentPickerHandle,
  {
    attachments: Attachment[];
    onChange: (next: Attachment[]) => void;
    disabled?: boolean;




    hideTrigger?: boolean;
  }
>(function AttachmentPicker({ attachments, onChange, disabled, hideTrigger }, ref) {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);




  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  useImperativeHandle(
    ref,
    () => ({
      addFiles: (files: File[]) => acceptFiles(files),
    }),



    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  async function onPick() {
    if (!user) return;
    const files = await pickFiles({ accept: UPLOAD_ACCEPT, multiple: true });
    if (files.length === 0) return;
    acceptFiles(files);
  }



  function acceptFiles(files: File[]) {
    setPickerError(null);
    if (!user || files.length === 0) return;

    const rejected: string[] = [];
    const accepted: File[] = [];
    const remainingSlots = Math.max(
      0,
      MAX_ATTACHMENTS_PER_ITEM - attachmentsRef.current.length - pending.length,
    );
    if (files.length > remainingSlots) {
      rejected.push(`You can attach up to ${MAX_ATTACHMENTS_PER_ITEM} files.`);
    }
    for (const f of files.slice(0, remainingSlots)) {
      const err = validateFile(f, {
        allowedTypes: ALLOWED_UPLOAD_TYPES,
        maxBytes: MAX_UPLOAD_BYTES,
      });
      if (err) rejected.push(err);
      else accepted.push(f);
    }
    if (rejected.length > 0) setPickerError(rejected.join(' '));
    if (accepted.length === 0) return;

    for (const file of accepted) {
      const key = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      const previewUrl = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined;
      const { attachment: attachmentPromise, cancel } = uploadFile({
        file,
        uid: user.uid,
        pathPrefix: 'uploads',
        onProgress: (percent) =>
          setPending((prev) =>
            prev.map((p) => (p.key === key ? { ...p, progress: percent } : p)),
          ),
      });

      const entry: PendingUpload = {
        key,
        file,
        progress: 0,
        cancel,
        previewUrl,
      };
      setPending((prev) => [...prev, entry]);

      attachmentPromise
        .then((attachment) => {
          setPending((prev) => prev.filter((p) => p.key !== key));
          const next = [...attachmentsRef.current, attachment];
          attachmentsRef.current = next;
          onChange(next);
          if (previewUrl) URL.revokeObjectURL(previewUrl);
        })
        .catch((err) => {
          console.error('[attachment-picker] upload failed:', err);
          const message = err instanceof Error ? err.message : 'Upload failed.';
          setPending((prev) =>
            prev.map((p) =>
              p.key === key ? { ...p, error: message, progress: 0 } : p,
            ),
          );
        });
    }
  }

  function cancelPending(key: string) {
    setPending((prev) => {
      const target = prev.find((p) => p.key === key);
      target?.cancel();
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  async function removeCommitted(index: number) {
    const target = attachments[index];
    const next = attachments.filter((_, i) => i !== index);
    onChange(next);


    if (target) deleteAttachment(target);
  }

  return (
    <View style={styles.wrap}>
      {!hideTrigger && (
        <>
          <TouchableOpacity
            style={[styles.pickBtn, disabled && styles.pickBtnDisabled]}
            onPress={onPick}
            disabled={disabled}
          >
            <ImageIcon size={16} color={COLORS.textPrimary} />
            <Text style={styles.pickLabel}>Add file</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Images, PDF, or PPTX. Up to {formatSize(MAX_UPLOAD_BYTES)}.</Text>
        </>
      )}

      {pickerError && <Text style={styles.error}>{pickerError}</Text>}

      {(pending.length > 0 || attachments.length > 0) && (
        <View style={styles.list}>
          {attachments.map((att, i) => (
            <View key={att.path} style={styles.row}>
              <Thumb attachment={att} />
              <View style={styles.rowMeta}>
                <Text style={styles.rowName} numberOfLines={1}>{att.name}</Text>
                <Text style={styles.rowSub}>{formatSize(att.size)}</Text>
              </View>
              <TouchableOpacity onPress={() => removeCommitted(i)} style={styles.rowClose}>
                <XIcon size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
          {pending.map((p) => (
            <View key={p.key} style={styles.row}>
              <View style={styles.thumbPlaceholder}>
                {p.previewUrl ? (
                  <Image source={{ uri: p.previewUrl }} style={styles.thumbImg} />
                ) : (
                  <Text style={styles.thumbLabel}>
                    {p.file.type === 'application/pdf' ? 'PDF' : p.file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ? 'PPT' : 'FILE'}
                  </Text>
                )}
              </View>
              <View style={styles.rowMeta}>
                <Text style={styles.rowName} numberOfLines={1}>{p.file.name}</Text>
                {p.error ? (
                  <Text style={styles.rowError}>{p.error}</Text>
                ) : (
                  <View style={styles.progressRow}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${p.progress}%` }]} />
                    </View>
                    <Text style={styles.rowSub}>{p.progress}%</Text>
                    <ActivityIndicator size="small" color={COLORS.textMuted} />
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => cancelPending(p.key)} style={styles.rowClose}>
                <XIcon size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

function Thumb({ attachment }: { attachment: Attachment }) {
  if (attachment.kind === 'image') {
    return <Image source={{ uri: attachment.url }} style={styles.thumbImg} />;
  }
  return (
    <View style={styles.thumbPlaceholder}>
      <Text style={styles.thumbLabel}>{attachment.kind === 'pdf' ? 'PDF' : attachment.kind === 'pptx' ? 'PPT' : 'FILE'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  pickBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    backgroundColor: COLORS.bgPanel,
  },
  pickBtnDisabled: { opacity: 0.5 },
  pickLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13 },
  hint: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginTop: 6 },
  error: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 12, marginTop: 8 },
  list: { marginTop: 12, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.separator,
    borderRadius: 8,
    backgroundColor: COLORS.bgPanel,
  },
  thumbImg: { width: 40, height: 40, borderRadius: 4, backgroundColor: COLORS.bgDark },
  thumbPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: COLORS.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbLabel: {
    color: COLORS.yellow,
    fontFamily: BODY_FONT,
    fontSize: 10,
    fontWeight: '700',
  },
  rowMeta: { flex: 1, minWidth: 0 },
  rowName: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13 },
  rowSub: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11 },
  rowError: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 11, marginTop: 2 },
  rowClose: { padding: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.separator,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.yellow },
});

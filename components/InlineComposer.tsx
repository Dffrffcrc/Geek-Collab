import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';
import { ImageIcon, SendIcon } from './Icons';
import { AttachmentPicker, type AttachmentPickerHandle } from './AttachmentPicker';
import { DropZone } from './DropZone';
import { pickFiles, UPLOAD_ACCEPT, type Attachment } from '../lib/uploads';














export type InlineComposerHandle = {
  focus: () => void;
  clear: () => void;
};

export const InlineComposer = forwardRef<
  InlineComposerHandle,
  {
    value: string;
    onChangeText: (v: string) => void;
    attachments: Attachment[];
    onAttachmentsChange: (next: Attachment[]) => void;
    onSubmit: () => void;
    placeholder?: string;
    busy?: boolean;

    size?: 'normal' | 'small';
  }
>(function InlineComposer(
  {
    value,
    onChangeText,
    attachments,
    onAttachmentsChange,
    onSubmit,
    placeholder = 'Write a comment…',
    busy,
    size = 'normal',
  },
  ref,
) {
  const inputRef = useRef<TextInput>(null);
  const pickerRef = useRef<AttachmentPickerHandle>(null);
  const [inputHeight, setInputHeight] = useState(size === 'small' ? 32 : 40);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      onChangeText('');
      setInputHeight(size === 'small' ? 32 : 40);
    },
  }));

  const canSubmit = value.trim().length > 0 || attachments.length > 0;
  const isSmall = size === 'small';

  async function openPicker() {
    const files = await pickFiles({ accept: UPLOAD_ACCEPT, multiple: true });
    if (files.length > 0) pickerRef.current?.addFiles(files);
  }

  return (
    <DropZone onFiles={(files) => pickerRef.current?.addFiles(files)}>
      <View style={[styles.pill, isSmall && styles.pillSmall]}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            isSmall && styles.inputSmall,
            { height: Math.max(isSmall ? 30 : 36, Math.min(inputHeight, isSmall ? 120 : 160)) },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textPlaceholder}
          multiline
          editable={!busy}
          onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height + 8)}
        />

        {/* Actions grouped on the right: media then send. Sits together as
            one cluster instead of one icon on each end of the pill. */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={openPicker}
            style={styles.iconBtn}
            disabled={busy}
            accessibilityLabel="Add file"
          >
            <ImageIcon size={isSmall ? 16 : 18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSubmit}
            disabled={!canSubmit || busy}
            style={[
              styles.sendBtn,
              isSmall && styles.sendBtnSmall,
              !canSubmit && styles.sendBtnDisabled,
            ]}
            accessibilityLabel="Send"
          >
            {busy ? (
              <ActivityIndicator size="small" color={canSubmit ? '#000' : COLORS.textMuted} />
            ) : (
              <SendIcon size={isSmall ? 13 : 15} color={canSubmit ? '#000' : COLORS.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <AttachmentPicker
        ref={pickerRef}
        attachments={attachments}
        onChange={onAttachmentsChange}
        disabled={busy}
        hideTrigger
      />
    </DropZone>
  );
});

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgPanel,
  },
  pillSmall: {
    borderRadius: 18,
    paddingLeft: 12,
    paddingVertical: 3,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 0,

    // @ts-expect-error web-only prop
    outlineStyle: 'none',
  },
  inputSmall: {
    fontSize: 13,
    paddingVertical: 6,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },


  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.yellow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.separator,
  },
});

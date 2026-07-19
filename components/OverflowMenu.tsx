import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { COLORS, BODY_FONT } from '../lib/theme';

export type MenuAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export function OverflowMenu({
  visible,
  onClose,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  actions: MenuAction[];
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {actions.map((a, i) => (
                <TouchableOpacity
                  key={`${a.label}-${i}`}
                  style={[styles.row, a.disabled && { opacity: 0.4 }]}
                  onPress={() => {
                    if (a.disabled) return;
                    a.onPress();
                    onClose();
                  }}
                  disabled={a.disabled}
                >
                  <Text style={[styles.label, a.destructive && styles.destructive]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.row, styles.cancelRow]} onPress={onClose}>
                <Text style={[styles.label, { color: COLORS.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    paddingVertical: 4,
  },
  row: { paddingVertical: 14, paddingHorizontal: 18 },
  cancelRow: { borderTopWidth: 1, borderTopColor: COLORS.separator, marginTop: 4 },
  label: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14 },
  destructive: { color: COLORS.error },
});

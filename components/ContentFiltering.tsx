import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { adminService, type ContentFilterRule } from '../lib/adminService';

interface ContentFilteringProps {
  rules: ContentFilterRule[];
  loading: boolean;
  adminId: string;
  onRulesUpdated: () => void;
}

const ContentFiltering: React.FC<ContentFilteringProps> = ({ rules, loading, adminId, onRulesUpdated }) => {
  const [newWord, setNewWord] = useState('');
  const [newSeverity, setNewSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [newAction, setNewAction] = useState<'warn' | 'quarantine' | 'delete'>('quarantine');
  const [addModalVisible, setAddModalVisible] = useState(false);

  const handleAddRule = async () => {
    if (!newWord.trim()) {
      Alert.alert('Error', 'Please enter a word to filter');
      return;
    }

    try {
      await adminService.addContentFilterRule(newWord, newSeverity, newAction, adminId);
      Alert.alert('Success', `Filter rule added for "${newWord}"`);
      setNewWord('');
      setAddModalVisible(false);
      onRulesUpdated();
    } catch (error) {
      Alert.alert('Error', 'Failed to add filter rule');
    }
  };

  const handleDeleteRule = (ruleId: string, word: string) => {
    Alert.alert(
      'Delete Filter Rule',
      `Remove filter for "${word}"?`,
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await adminService.deleteContentFilterRule(ruleId);
              Alert.alert('Success', 'Filter rule deleted');
              onRulesUpdated();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete filter rule');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'high':
        return COLORS.danger;
      case 'medium':
        return COLORS.warning;
      case 'low':
        return COLORS.primary;
      default:
        return COLORS.textMuted;
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'delete':
        return COLORS.danger;
      case 'quarantine':
        return COLORS.warning;
      case 'warn':
        return COLORS.primary;
      default:
        return COLORS.textMuted;
    }
  };

  const renderRuleItem = ({ item }: { item: ContentFilterRule }) => (
    <View style={styles.ruleCard}>
      <View style={styles.ruleHeader}>
        <View style={styles.ruleWord}>
          <Ionicons name="filter" size={18} color={COLORS.primary} />
          <Text style={styles.word}>{item.word}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDeleteRule(item.id, item.word)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.ruleDetails}>
        <View style={[styles.badge, { backgroundColor: getSeverityColor(item.severity) + '20' }]}>
          <Text style={[styles.badgeText, { color: getSeverityColor(item.severity) }]}>
            {item.severity.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getActionColor(item.action) + '20' }]}>
          <Text style={[styles.badgeText, { color: getActionColor(item.action) }]}>
            {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
          </Text>
        </View>
        <Text style={styles.createdBy}>By {item.createdBy}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
        <Text style={styles.loadingText}>Loading filters...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Content Filtering</Text>
      <Text style={styles.subtitle}>Manage prohibited words and content rules</Text>

      <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
        <Ionicons name="add-circle" size={18} color={COLORS.bgDark} />
        <Text style={styles.addButtonText}>Add New Filter</Text>
      </TouchableOpacity>

      <Text style={styles.ruleCount}>{rules.length} active filter rules</Text>

      {rules.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
          <Text style={styles.emptyStateTitle}>No Filter Rules</Text>
          <Text style={styles.emptyStateText}>Add your first content filter</Text>
        </View>
      ) : (
        <FlatList
          data={rules}
          renderItem={renderRuleItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Add Filter Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Filter Rule</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Word/Phrase to Filter</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter word (e.g., 'badword')"
                placeholderTextColor={COLORS.textMuted}
                value={newWord}
                onChangeText={setNewWord}
                maxLength={50}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Severity Level</Text>
              <View style={styles.optionsContainer}>
                {(['low', 'medium', 'high'] as const).map((severity) => (
                  <TouchableOpacity
                    key={severity}
                    style={[styles.option, newSeverity === severity && styles.optionActive]}
                    onPress={() => setNewSeverity(severity)}
                  >
                    <Text style={[styles.optionText, newSeverity === severity && styles.optionTextActive]}>
                      {severity.charAt(0).toUpperCase() + severity.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Action When Triggered</Text>
              <View style={styles.optionsContainer}>
                {(['warn', 'quarantine', 'delete'] as const).map((action) => (
                  <TouchableOpacity
                    key={action}
                    style={[styles.option, newAction === action && styles.optionActive]}
                    onPress={() => setNewAction(action)}
                  >
                    <Text style={[styles.optionText, newAction === action && styles.optionTextActive]}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.btn, styles.addBtn]} onPress={handleAddRule}>
                <Ionicons name="checkmark" size={18} color="#000" />
                <Text style={styles.addBtnText}>Add Filter</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: BODY_FONT,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
    fontFamily: HEADING_FONT,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
    fontFamily: BODY_FONT,
  },
  addButton: {
    backgroundColor: COLORS.yellow,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    fontFamily: BODY_FONT,
  },
  ruleCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
    fontFamily: BODY_FONT,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
    fontFamily: HEADING_FONT,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    fontFamily: BODY_FONT,
  },
  ruleCard: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ruleWord: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  word: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
  },
  ruleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: BODY_FONT,
  },
  createdBy: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
  },
  separator: {
    height: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgDark,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: HEADING_FONT,
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontFamily: BODY_FONT,
  },
  input: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: BODY_FONT,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: BODY_FONT,
  },
  optionTextActive: {
    color: '#000',
  },
  actionButtons: {
    gap: 10,
    marginTop: 20,
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    backgroundColor: COLORS.yellow,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    fontFamily: BODY_FONT,
  },
  cancelBtn: {
    backgroundColor: COLORS.bgLight,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: BODY_FONT,
  },
});

export default ContentFiltering;

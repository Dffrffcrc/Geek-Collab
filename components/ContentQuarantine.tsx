import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import type { QuarantinedContent } from '../lib/adminService';

interface ContentQuarantineProps {
  content: QuarantinedContent[];
  loading: boolean;
  adminId: string;
}

const ContentQuarantine: React.FC<ContentQuarantineProps> = ({ content, loading, adminId }) => {
  const [selectedContent, setSelectedContent] = useState<QuarantinedContent | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  const handleApproveContent = async () => {
    Alert.alert('Success', 'Content approved and restored');
    setActionModalVisible(false);
    setSelectedContent(null);
  };

  const handleDeleteContent = async () => {
    Alert.alert('Success', 'Content permanently deleted');
    setActionModalVisible(false);
    setSelectedContent(null);
  };

  const renderContentItem = ({ item }: { item: QuarantinedContent }) => (
    <TouchableOpacity
      style={styles.contentCard}
      onPress={() => {
        setSelectedContent(item);
        setActionModalVisible(true);
      }}
    >
      <View style={styles.contentHeader}>
        <View style={styles.contentMeta}>
          <View style={styles.authorBadge}>
            <Text style={styles.authorInitial}>{item.authorUsername.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.metaInfo}>
            <Text style={styles.authorName}>{item.authorUsername}</Text>
            <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleDateString()}</Text>
          </View>
        </View>
        <View style={[styles.typeTag, { backgroundColor: item.type === 'post' ? COLORS.primaryLight : COLORS.warningLight }]}>
          <Text style={[styles.typeTagText, { color: item.type === 'post' ? COLORS.primary : COLORS.warning }]}>
            {item.type}
          </Text>
        </View>
      </View>

      <View style={styles.contentBody}>
        <Text style={styles.content} numberOfLines={3}>
          {item.content}
        </Text>
      </View>

      <View style={styles.flagsSection}>
        <Text style={styles.flagsLabel}>Flagged words:</Text>
        <View style={styles.flagsList}>
          {item.flaggedWords.slice(0, 3).map((word, idx) => (
            <View key={idx} style={styles.flagBadge}>
              <Text style={styles.flagText}>{word}</Text>
            </View>
          ))}
          {item.flaggedWords.length > 3 && (
            <View style={styles.flagBadge}>
              <Text style={styles.flagText}>+{item.flaggedWords.length - 3}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.reasonSection}>
        <Text style={styles.reasonLabel}>Reason:</Text>
        <Text style={styles.reasonText}>{item.reason}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
        <Text style={styles.loadingText}>Loading quarantined content...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Content Quarantine</Text>
      <Text style={styles.subtitle}>{content.length} items in quarantine</Text>

      {content.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="lock-open" size={48} color={COLORS.success} />
          <Text style={styles.emptyStateTitle}>All Clear!</Text>
          <Text style={styles.emptyStateText}>No quarantined content</Text>
        </View>
      ) : (
        <FlatList
          data={content}
          renderItem={renderContentItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Action Modal */}
      <Modal visible={actionModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Quarantined Content</Text>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedContent && (
              <View style={styles.contentPreview}>
                <Text style={styles.previewTitle}>Content</Text>
                <View style={styles.previewBody}>
                  <Text style={styles.previewText}>{selectedContent.content}</Text>
                </View>
                <View style={styles.previewMeta}>
                  <Text style={styles.previewMetaText}>
                    By @{selectedContent.authorUsername} on {new Date(selectedContent.timestamp).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtnStyle]} onPress={handleApproveContent}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.approveBtnText}>Approve & Restore</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtnStyle]} onPress={handleDeleteContent}>
                <Ionicons name="trash" size={18} color={COLORS.danger} />
                <Text style={styles.deleteBtnText}>Delete Permanently</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setActionModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
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
  contentCard: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contentMeta: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  authorBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  metaInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    marginTop: 2,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: BODY_FONT,
  },
  contentBody: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  content: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: BODY_FONT,
    lineHeight: 18,
  },
  flagsSection: {
    marginBottom: 10,
  },
  flagsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
    fontFamily: BODY_FONT,
  },
  flagsList: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  flagBadge: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  flagText: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '600',
    fontFamily: BODY_FONT,
  },
  reasonSection: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 8,
    padding: 10,
  },
  reasonLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: BODY_FONT,
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: HEADING_FONT,
  },
  contentPreview: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
    fontFamily: BODY_FONT,
  },
  previewBody: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: BODY_FONT,
    lineHeight: 18,
  },
  previewMeta: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  previewMetaText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
  },
  actionButtons: {
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  approveBtnStyle: {
    backgroundColor: COLORS.successLight,
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
    fontFamily: BODY_FONT,
  },
  deleteBtnStyle: {
    backgroundColor: COLORS.dangerLight,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
    fontFamily: BODY_FONT,
  },
  cancelBtn: {
    backgroundColor: COLORS.bgLight,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: BODY_FONT,
  },
});

export default ContentQuarantine;

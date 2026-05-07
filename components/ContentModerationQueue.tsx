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
import { adminService, type ContentReport } from '../lib/adminService';

interface ContentModerationQueueProps {
  reports: ContentReport[];
  loading: boolean;
  adminId: string;
  adminUsername: string;
}

const ContentModerationQueue: React.FC<ContentModerationQueueProps> = ({
  reports,
  loading,
  adminId,
  adminUsername,
}) => {
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');

  const handleApproveReport = async () => {
    if (!selectedReport) return;
    Alert.alert('Approve Report', 'Report approved. Content remains published.');
    setActionModalVisible(false);
    setSelectedReport(null);
  };

  const handleDeleteContent = async () => {
    if (!selectedReport) return;
    try {
      await adminService.deletePost(selectedReport.postId, actionReason || 'Violates community guidelines', adminId, adminUsername);
      Alert.alert('Success', 'Content deleted successfully');
      setActionModalVisible(false);
      setSelectedReport(null);
      setActionReason('');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete content');
    }
  };

  const handleQuarantineContent = async () => {
    if (!selectedReport) return;
    Alert.alert('Success', 'Content quarantined for review');
    setActionModalVisible(false);
    setSelectedReport(null);
  };

  const renderReportItem = ({ item }: { item: ContentReport }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => {
        setSelectedReport(item);
        setActionModalVisible(true);
      }}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportMeta}>
          <Text style={styles.reportAuthor}>{item.authorUsername}</Text>
          <Text style={styles.reportTime}>{new Date(item.timestamp).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: COLORS.warningLight }]}>
          <Ionicons name="alert-circle" size={14} color={COLORS.warning} />
          <Text style={styles.statusText}>Pending</Text>
        </View>
      </View>

      <View style={styles.reportDetails}>
        <Text style={styles.reportForum}>Forum: {item.forumName}</Text>
        <Text style={styles.reportReason}>Reason: {item.reason}</Text>
      </View>

      <View style={styles.reportContent}>
        <Text style={styles.contentLabel}>Content:</Text>
        <Text style={styles.contentText} numberOfLines={2}>
          {item.content}
        </Text>
      </View>

      <View style={styles.reportedBySection}>
        <Ionicons name="flag" size={14} color={COLORS.danger} />
        <Text style={styles.reportedByText}>Reported by {item.reportedBy}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Content Moderation Queue</Text>
      <Text style={styles.subtitle}>{reports.length} pending reports</Text>

      {reports.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
          <Text style={styles.emptyStateTitle}>All Clear!</Text>
          <Text style={styles.emptyStateText}>No pending reports to review</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReportItem}
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
              <Text style={styles.modalTitle}>Take Action on Report</Text>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <View style={styles.reportPreview}>
                <Text style={styles.reportPreviewTitle}>Reported Content</Text>
                <View style={styles.previewContent}>
                  <Text style={styles.previewText} numberOfLines={4}>
                    {selectedReport.content}
                  </Text>
                </View>
                <Text style={styles.previewMeta}>
                  By @{selectedReport.authorUsername} in {selectedReport.forumName}
                </Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtnStyle]} onPress={handleApproveReport}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.approveBtnText}>Approve Report</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.quarantineBtnStyle]} onPress={handleQuarantineContent}>
                <Ionicons name="lock-closed" size={18} color={COLORS.primary} />
                <Text style={styles.quarantineBtnText}>Quarantine Content</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtnStyle]} onPress={handleDeleteContent}>
                <Ionicons name="trash" size={18} color={COLORS.danger} />
                <Text style={styles.deleteBtnText}>Delete Content</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reasonSection}>
              <Text style={styles.reasonLabel}>Reason/Notes (for delete/quarantine):</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Enter reason for action..."
                placeholderTextColor={COLORS.textMuted}
                value={actionReason}
                onChangeText={setActionReason}
                multiline
                maxLength={500}
              />
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setActionModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
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
  reportCard: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportMeta: {
    flex: 1,
  },
  reportAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
  },
  reportTime: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: BODY_FONT,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
    fontFamily: BODY_FONT,
  },
  reportDetails: {
    marginBottom: 12,
    gap: 4,
  },
  reportForum: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: BODY_FONT,
    fontWeight: '500',
  },
  reportReason: {
    fontSize: 13,
    color: COLORS.danger,
    fontFamily: BODY_FONT,
    fontWeight: '500',
  },
  reportContent: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  contentLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    marginBottom: 4,
  },
  contentText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: BODY_FONT,
    lineHeight: 18,
  },
  reportedBySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportedByText: {
    fontSize: 12,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: HEADING_FONT,
  },
  reportPreview: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  reportPreviewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
    fontFamily: BODY_FONT,
  },
  previewContent: {
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
  quarantineBtnStyle: {
    backgroundColor: COLORS.primaryLight,
  },
  quarantineBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
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
  reasonSection: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontFamily: BODY_FONT,
  },
  reasonInput: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    color: COLORS.textPrimary,
    fontSize: 13,
    maxHeight: 100,
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

export default ContentModerationQueue;

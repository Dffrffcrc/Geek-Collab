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
import { adminService } from '../lib/adminService';

interface ForumManagementProps {
  adminId: string;
  adminUsername: string;
}

interface Forum {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  moderators: string[];
  postCount: number;
  memberCount: number;
  isActive: boolean;
}

const ForumManagement: React.FC<ForumManagementProps> = ({ adminId, adminUsername }) => {
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  React.useEffect(() => {
    loadForums();
  }, []);

  const loadForums = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllForums();
      setForums(data as Forum[]);
    } catch (error) {
      console.error('Failed to load forums:', error);
    }
    setLoading(false);
  };

  const handleDeleteForum = async (forumId: string, forumName: string) => {
    Alert.alert(
      'Delete Forum',
      `Are you sure you want to delete "${forumName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await adminService.deleteForum(forumId);
              Alert.alert('Success', 'Forum deleted');
              await loadForums();
              setDetailModalVisible(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete forum');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderForumItem = ({ item }: { item: Forum }) => (
    <TouchableOpacity
      style={styles.forumCard}
      onPress={() => {
        setSelectedForum(item);
        setDetailModalVisible(true);
      }}
    >
      <View style={styles.forumHeader}>
        <View style={styles.forumInfo}>
          <View style={styles.forumIconContainer}>
            <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.forumMeta}>
            <Text style={styles.forumName}>{item.name}</Text>
            <Text style={styles.forumDesc} numberOfLines={1}>
              {item.description}
            </Text>
          </View>
        </View>
        {!item.isActive && (
          <View style={styles.inactiveBadge}>
            <Ionicons name="close-circle" size={16} color={COLORS.danger} />
          </View>
        )}
      </View>

      <View style={styles.forumStats}>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble" size={14} color={COLORS.textMuted} />
          <Text style={styles.statText}>{item.postCount} posts</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="people" size={14} color={COLORS.textMuted} />
          <Text style={styles.statText}>{item.memberCount} members</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="shield" size={14} color={COLORS.textMuted} />
          <Text style={styles.statText}>{item.moderators.length} mods</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
        <Text style={styles.loadingText}>Loading forums...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forum Management</Text>
      <Text style={styles.subtitle}>{forums.length} forums</Text>

      {forums.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyStateTitle}>No Forums</Text>
          <Text style={styles.emptyStateText}>No forums available for management</Text>
        </View>
      ) : (
        <FlatList
          data={forums}
          renderItem={renderForumItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Forum Detail Modal */}
      <Modal visible={detailModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Forum Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedForum && (
              <>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{selectedForum.name}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedForum.description}</Text>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
                    <Text style={styles.statCardValue}>{selectedForum.postCount}</Text>
                    <Text style={styles.statCardLabel}>Posts</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="people" size={20} color={COLORS.primary} />
                    <Text style={styles.statCardValue}>{selectedForum.memberCount}</Text>
                    <Text style={styles.statCardLabel}>Members</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="shield" size={20} color={COLORS.primary} />
                    <Text style={styles.statCardValue}>{selectedForum.moderators.length}</Text>
                    <Text style={styles.statCardLabel}>Moderators</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.openBtnStyle]}
                    onPress={() => Alert.alert('View Forum', 'Opening forum...')}
                  >
                    <Ionicons name="open" size={18} color={COLORS.primary} />
                    <Text style={styles.openBtnText}>Open Forum</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.modBtnStyle]}
                    onPress={() => Alert.alert('Manage Moderators', 'Moderator management coming soon')}
                  >
                    <Ionicons name="person-add" size={18} color={COLORS.warning} />
                    <Text style={styles.modBtnText}>Add Moderator</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtnStyle]}
                    onPress={() => selectedForum && handleDeleteForum(selectedForum.id, selectedForum.name)}
                  >
                    <Ionicons name="trash" size={18} color={COLORS.danger} />
                    <Text style={styles.deleteBtnText}>Delete Forum</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setDetailModalVisible(false)}>
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
  forumCard: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  forumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  forumInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  forumIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forumMeta: {
    flex: 1,
  },
  forumName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
  },
  forumDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    marginTop: 2,
  },
  inactiveBadge: {
    backgroundColor: COLORS.dangerLight,
    padding: 6,
    borderRadius: 6,
  },
  forumStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
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
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
    fontFamily: BODY_FONT,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: BODY_FONT,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 6,
    fontFamily: HEADING_FONT,
  },
  statCardLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
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
  openBtnStyle: {
    backgroundColor: COLORS.primaryLight,
  },
  openBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: BODY_FONT,
  },
  modBtnStyle: {
    backgroundColor: COLORS.warningLight,
  },
  modBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
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

export default ForumManagement;

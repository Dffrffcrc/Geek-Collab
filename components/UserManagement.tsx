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
import { adminService, type UserStats } from '../lib/adminService';

interface UserManagementProps {
  users: UserStats[];
  loading: boolean;
  adminId: string;
  adminUsername: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, loading, adminId, adminUsername }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [muteDurationModal, setMuteDurationModal] = useState(false);
  const [muteDuration, setMuteDuration] = useState('1'); // hours

  const filteredUsers = users.filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleBanUser = async () => {
    if (!selectedUser) return;
    try {
      await adminService.banUser(selectedUser.id, selectedUser.username, 'Banned by admin', adminId, adminUsername);
      Alert.alert('Success', `${selectedUser.username} has been banned`);
      setActionModalVisible(false);
      setSelectedUser(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to ban user');
    }
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;
    try {
      await adminService.unbanUser(selectedUser.id);
      Alert.alert('Success', `${selectedUser.username} has been unbanned`);
      setActionModalVisible(false);
      setSelectedUser(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to unban user');
    }
  };

  const handleMuteUser = async () => {
    if (!selectedUser) return;
    const durationMs = parseInt(muteDuration) * 3600000; // convert hours to ms
    try {
      await adminService.muteUser(selectedUser.id, selectedUser.username, durationMs, 'Muted by admin', adminId, adminUsername);
      Alert.alert('Success', `${selectedUser.username} has been muted for ${muteDuration} hours`);
      setMuteDurationModal(false);
      setActionModalVisible(false);
      setSelectedUser(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to mute user');
    }
  };

  const handleUnmuteUser = async () => {
    if (!selectedUser) return;
    try {
      await adminService.unmuteUser(selectedUser.id);
      Alert.alert('Success', `${selectedUser.username} has been unmuted`);
      setActionModalVisible(false);
      setSelectedUser(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to unmute user');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return COLORS.danger;
      case 'moderator':
        return COLORS.warning;
      default:
        return COLORS.textMuted;
    }
  };

  const renderUserItem = ({ item }: { item: UserStats }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => {
        setSelectedUser(item);
        setActionModalVisible(true);
      }}
    >
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.userIconContainer}>
            <Text style={styles.userIcon}>{item.username.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.email}>{item.email}</Text>
          </View>
        </View>
        <View style={styles.userMeta}>
          {item.role !== 'user' && (
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
              <Text style={[styles.roleBadgeText, { color: getRoleColor(item.role) }]}>{item.role}</Text>
            </View>
          )}
          {item.isBanned && <Ionicons name="ban" size={18} color={COLORS.danger} />}
          {item.isMuted && !item.isBanned && <Ionicons name="mic-off" size={18} color={COLORS.warning} />}
        </View>
      </View>

      <View style={styles.userStats}>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble" size={14} color={COLORS.textMuted} />
          <Text style={styles.statText}>{item.postCount} posts</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="alert-circle" size={14} color={COLORS.textMuted} />
          <Text style={styles.statText}>{item.reportCount} reports</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="warning" size={14} color={COLORS.textMuted} />
          <Text style={styles.statText}>{item.warningCount} warnings</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Management</Text>
      <Text style={styles.subtitle}>Manage platform users and permissions</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search users by username..."
        placeholderTextColor={COLORS.textMuted}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Text style={styles.resultCount}>{filteredUsers.length} users found</Text>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Action Modal */}
      <Modal visible={actionModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Actions</Text>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <View style={styles.userPreview}>
                <View style={styles.userIconContainer}>
                  <Text style={styles.userIcon}>{selectedUser.username.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.userPreviewInfo}>
                  <Text style={styles.userPreviewName}>{selectedUser.username}</Text>
                  <Text style={styles.userPreviewEmail}>{selectedUser.email}</Text>
                  <View style={styles.userPreviewStats}>
                    <Text style={styles.previewStat}>{selectedUser.postCount} posts</Text>
                    <Text style={styles.previewStat}>•</Text>
                    <Text style={styles.previewStat}>{selectedUser.reportCount} reports</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.actionButtons}>
              {!selectedUser?.isBanned && (
                <TouchableOpacity style={[styles.actionBtn, styles.banBtnStyle]} onPress={handleBanUser}>
                  <Ionicons name="ban" size={18} color={COLORS.danger} />
                  <Text style={styles.banBtnText}>Ban User</Text>
                </TouchableOpacity>
              )}

              {selectedUser?.isBanned && (
                <TouchableOpacity style={[styles.actionBtn, styles.unbanBtnStyle]} onPress={handleUnbanUser}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                  <Text style={styles.unbanBtnText}>Unban User</Text>
                </TouchableOpacity>
              )}

              {!selectedUser?.isMuted && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.muteBtnStyle]}
                  onPress={() => setMuteDurationModal(true)}
                >
                  <Ionicons name="mic-off" size={18} color={COLORS.warning} />
                  <Text style={styles.muteBtnText}>Mute User</Text>
                </TouchableOpacity>
              )}

              {selectedUser?.isMuted && (
                <TouchableOpacity style={[styles.actionBtn, styles.unmuteBtnStyle]} onPress={handleUnmuteUser}>
                  <Ionicons name="mic" size={18} color={COLORS.success} />
                  <Text style={styles.unmuteBtnText}>Unmute User</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.actionBtn, styles.viewProfileBtnStyle]}>
                <Ionicons name="person" size={18} color={COLORS.primary} />
                <Text style={styles.viewProfileBtnText}>View Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtnStyle]}>
                <Ionicons name="trash" size={18} color={COLORS.danger} />
                <Text style={styles.deleteBtnText}>Delete All Posts</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setActionModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Mute Duration Modal */}
      <Modal visible={muteDurationModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.muteDurationContent}>
            <Text style={styles.muteDurationTitle}>Mute Duration</Text>
            <View style={styles.durationOptions}>
              {['1', '6', '24', '72'].map((hours) => (
                <TouchableOpacity
                  key={hours}
                  style={[styles.durationOption, muteDuration === hours && styles.durationOptionActive]}
                  onPress={() => setMuteDuration(hours)}
                >
                  <Text
                    style={[
                      styles.durationOptionText,
                      muteDuration === hours && styles.durationOptionTextActive,
                    ]}
                  >
                    {hours}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.durationButtonsContainer}>
              <TouchableOpacity
                style={[styles.durationBtn, styles.durationCancelBtn]}
                onPress={() => setMuteDurationModal(false)}
              >
                <Text style={styles.durationCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.durationBtn, styles.durationConfirmBtn]} onPress={handleMuteUser}>
                <Text style={styles.durationConfirmBtnText}>Confirm</Text>
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
    marginBottom: 12,
    fontFamily: BODY_FONT,
  },
  searchInput: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: BODY_FONT,
  },
  resultCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
    fontFamily: BODY_FONT,
  },
  userCard: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  userIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
  },
  email: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: BODY_FONT,
  },
  userStats: {
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
  userPreview: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userPreviewInfo: {
    flex: 1,
  },
  userPreviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
  },
  userPreviewEmail: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    marginTop: 2,
  },
  userPreviewStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  previewStat: {
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
  banBtnStyle: {
    backgroundColor: COLORS.dangerLight,
  },
  banBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
    fontFamily: BODY_FONT,
  },
  unbanBtnStyle: {
    backgroundColor: COLORS.successLight,
  },
  unbanBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
    fontFamily: BODY_FONT,
  },
  muteBtnStyle: {
    backgroundColor: COLORS.warningLight,
  },
  muteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
    fontFamily: BODY_FONT,
  },
  unmuteBtnStyle: {
    backgroundColor: COLORS.successLight,
  },
  unmuteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
    fontFamily: BODY_FONT,
  },
  viewProfileBtnStyle: {
    backgroundColor: COLORS.primaryLight,
  },
  viewProfileBtnText: {
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
  muteDurationContent: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 16,
    padding: 20,
    margin: 20,
    marginTop: '50%',
  },
  muteDurationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
    fontFamily: HEADING_FONT,
    textAlign: 'center',
  },
  durationOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  durationOptionActive: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  durationOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: BODY_FONT,
  },
  durationOptionTextActive: {
    color: '#000',
  },
  durationButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  durationCancelBtn: {
    backgroundColor: COLORS.bgLight,
  },
  durationCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: BODY_FONT,
  },
  durationConfirmBtn: {
    backgroundColor: COLORS.yellow,
  },
  durationConfirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    fontFamily: BODY_FONT,
  },
});

export default UserManagement;

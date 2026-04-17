import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SideMenuDrawer = ({
  visible,
  onClose,
  currentUser,
  forums,
  activeForum,
  onSelectForum,
  onEditProfile,
  onLogout,
  permissions,
}) => {
  if (!visible) return null;

  const profileImageURI = currentUser.profileImage
    ? typeof currentUser.profileImage === 'string'
      ? currentUser.profileImage.startsWith('data:')
        ? currentUser.profileImage
        : `data:image/jpeg;base64,${currentUser.profileImage}`
      : null
    : null;

  return (
    <>
      {/* Overlay Backdrop */}
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

      {/* Side Drawer */}
      <View style={styles.drawer}>
        <SafeAreaView style={styles.drawerContainer}>
          {/* Header - User Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileTop}>
              {profileImageURI ? (
                <Image source={{ uri: profileImageURI }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person-circle" size={60} color="#BFDBFE" />
                </View>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>{currentUser.displayName || currentUser.username}</Text>
              <Text style={styles.username}>@{currentUser.username}</Text>
              {currentUser.bio && (
                <Text style={styles.bio} numberOfLines={2}>{currentUser.bio}</Text>
              )}
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{currentUser.role}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.editProfileButton} onPress={onEditProfile}>
              <Ionicons name="pencil" size={14} color="#fff" />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Forum List */}
          <View style={styles.forumSection}>
            <Text style={styles.sectionTitle}>Forums</Text>
            <ScrollView
              style={styles.forumList}
              showsVerticalScrollIndicator={true}
              scrollIndicatorInsets={{ right: -10 }}
            >
              {forums && forums.length > 0 ? (
                forums.map((forum) => {
                  const isActive = activeForum?.id === forum.id;
                  return (
                    <TouchableOpacity
                      key={forum.id}
                      style={[styles.forumItem, isActive && styles.forumItemActive]}
                      onPress={() => {
                        onSelectForum(forum.id);
                        onClose();
                      }}
                    >
                      <View style={styles.forumItemContent}>
                        <Text
                          style={[styles.forumItemTitle, isActive && styles.forumItemTitleActive]}
                          numberOfLines={1}
                        >
                          {forum.title}
                        </Text>
                        <Text style={[styles.forumItemMeta, isActive && styles.forumItemMetaActive]}>
                          {forum.isReadOnly ? '🔒 Read-only' : '📝 Open'}
                        </Text>
                      </View>
                      {isActive && <Ionicons name="checkmark-circle" size={20} color="#2563EB" />}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.noForumsText}>No forums available</Text>
              )}
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                onClose();
                // FAQ can be opened from main view
              }}
            >
              <Ionicons name="help-circle-outline" size={18} color="#6B7280" />
              <Text style={styles.actionButtonText}>FAQ</Text>
            </TouchableOpacity>

            {permissions.canModerate && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  onClose();
                  // Mod panel can be opened from main view
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color="#6B7280" />
                <Text style={styles.actionButtonText}>Admin Panel</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: Math.min(280, Dimensions.get('window').width * 0.75),
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    zIndex: 1000,
    ...(Platform.OS === 'web'
      ? { boxShadow: '2px 0px 8px rgba(0, 0, 0, 0.1)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 2, height: 0 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        }),
    elevation: 10,
  },
  drawerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  profileCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  profileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
  },
  profileImagePlaceholder: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 6,
    opacity: 0.7,
  },
  profileInfo: {
    gap: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  username: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  bio: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
  },
  roleBadge: {
    marginTop: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1D4ED8',
    textTransform: 'uppercase',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editProfileButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  forumSection: {
    flex: 1,
    minHeight: 0,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  forumList: {
    flex: 1,
  },
  forumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 6,
    gap: 10,
    flex: 1,
  },
  forumItemActive: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  forumItemContent: {
    flex: 1,
  },
  forumItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  forumItemTitleActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  forumItemMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  forumItemMetaActive: {
    color: '#2563EB',
  },
  noForumsText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  actions: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTopY: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10,
    marginTop: 4,
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default SideMenuDrawer;

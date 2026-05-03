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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Reddit-inspired colors
const Colors = {
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  surface: '#FFFFFF',
  background: '#F9FAFB',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  danger: '#DC2626',
};

const SideMenuDrawer = ({
  visible,
  onClose,
  currentUser,
  forums,
  recentForums,
  activeForum,
  onSelectForum,
  onPastForums,
  onSettings,
  onLogout,
  permissions,
  onAdminPanel,
  isDarkMode = false,
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
      <View style={[styles.drawer, isDarkMode && styles.drawerDark]}>
        <SafeAreaView style={styles.drawerContainer}>
          {/* Header - User Profile Card */}
          <View style={[styles.profileCard, isDarkMode && styles.profileCardDark]}>
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
              <Text style={[styles.displayName, isDarkMode && styles.displayNameDark]}>{currentUser.displayName || currentUser.username}</Text>
              <Text style={[styles.username, isDarkMode && styles.usernameDark]}>@{currentUser.username}</Text>
              {currentUser.bio && (
                <Text style={[styles.bio, isDarkMode && styles.bioDark]} numberOfLines={2}>{currentUser.bio}</Text>
              )}
              <View style={[styles.roleBadge, isDarkMode && styles.roleBadgeDark]}>
                <Text style={[styles.roleBadgeText, isDarkMode && styles.roleBadgeTextDark]}>{currentUser.role}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.editProfileButton} onPress={onSettings}>
              <Ionicons name="settings-outline" size={14} color="#fff" />
              <Text style={styles.editProfileButtonText}>Settings</Text>
            </TouchableOpacity>
          </View>

          {/* Forum Navigation */}
          <ScrollView
            style={styles.forumsContainer}
            showsVerticalScrollIndicator={false}
            scrollIndicatorInsets={{ right: -10 }}
          >
            {/* Recently Visited */}
            {recentForums && recentForums.length > 0 ? (
              <View style={styles.forumGroup}>
                <Text style={styles.sectionTitle}>Recently visited</Text>
                {recentForums.map((forum) => {
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
                      <View style={styles.forumItemLeft}>
                        <Text
                          style={[styles.forumItemTitle, isActive && styles.forumItemTitleActive]}
                          numberOfLines={1}
                        >
                          {forum.title}
                        </Text>
                      </View>
                      {forum.isReadOnly && <View style={styles.readOnlyBadge}><Text style={styles.badgeText}>R/O</Text></View>}
                      {isActive && <Ionicons name="checkmark" size={16} color="#2563EB" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            {/* Open Forums */}
            {forums && forums.length > 0 ? (
              <View style={styles.forumGroup}>
                <Text style={styles.sectionTitle}>Open forums</Text>
                {forums.map((forum) => {
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
                      <View style={styles.forumItemLeft}>
                        <Text
                          style={[styles.forumItemTitle, isActive && styles.forumItemTitleActive]}
                          numberOfLines={1}
                        >
                          {forum.title}
                        </Text>
                      </View>
                      {forum.isReadOnly && <View style={styles.readOnlyBadge}><Text style={styles.badgeText}>R/O</Text></View>}
                      {isActive && <Ionicons name="checkmark" size={16} color="#2563EB" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noForumsText}>No forums available</Text>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.pastForumsButton} onPress={onPastForums}>
            <Ionicons name="time-outline" size={16} color="#2563EB" />
            <Text style={styles.pastForumsText}>Past forums</Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {(
              permissions.canModerate ||
              currentUser?.role === 'admin' ||
              (Array.isArray(currentUser?.forumModerators) && currentUser.forumModerators.length > 0)
            ) && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  onClose();
                  onAdminPanel && onAdminPanel();
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={16} color="#2563EB" />
                <Text style={styles.actionButtonText}>
                  {currentUser?.role === 'admin' ? 'Admin Panel' : 'Moderator'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={16} color="#EF4444" />
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
  forumsContainer: {
    flex: 1,
  },
  forumGroup: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  forumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 8,
    marginBottom: 4,
    gap: 8,
  },
  forumItemLeft: {
    flex: 1,
    minWidth: 0,
  },
  forumItemTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  forumItemTitleActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  forumItemActive: {
    backgroundColor: 'transparent',
  },
  readOnlyBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  pastForumsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    marginTop: 8,
  },
  pastForumsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  noForumsText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  actions: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
    backgroundColor: '#EFF6FF',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
    backgroundColor: '#FEE2E2',
  },
  logoutButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  // Dark mode styles
  drawerDark: {
    backgroundColor: '#1F2937',
    borderRightColor: '#334155',
  },
  profileCardDark: {
    backgroundColor: '#111827',
    borderColor: '#334155',
  },
  displayNameDark: {
    color: '#93C5FD',
  },
  usernameDark: {
    color: '#94A3B8',
  },
  bioDark: {
    color: '#CBD5E1',
  },
  roleBadgeDark: {
    backgroundColor: '#0C4A6E',
  },
  roleBadgeTextDark: {
    color: '#93C5FD',
  },
  editProfileButtonDark: {
    backgroundColor: '#1D4ED8',
  },
  editProfileButtonTextDark: {
    color: '#E2E8F0',
  },
});

export default SideMenuDrawer;

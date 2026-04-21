import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  Image,
  useWindowDimensions,
} from 'react-native';
import MediaPicker from './MediaPicker';

const toImageURI = (image) => {
  if (!image) return null;
  if (typeof image === 'string') return image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
  if (image.uri) return image.uri;
  if (image.base64) {
    const mimeType = image.mimeType || 'image/jpeg';
    return `data:${mimeType};base64,${image.base64}`;
  }
  return null;
};

const relativeDate = (dateStr) => {
  const interval = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (interval < 3600) return 'Now';
  if (interval < 86400) return `${Math.floor(interval / 3600)}h ago`;
  return `${Math.floor(interval / 86400)}d ago`;
};

const UserProfileView = ({
  userID,
  userName,
  profileUser,
  currentUser,
  viewModel,
  onProfileUpdated,
  profileUpdateError,
  profileUpdateLoading,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('posts');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editProfileImage, setEditProfileImage] = useState(null);
  const { width } = useWindowDimensions();
  const posts = useMemo(() => viewModel.getPostsByAuthor(userID), [viewModel, userID]);
  const totalLikes = useMemo(() => posts.reduce((sum, post) => sum + (post.likes || 0), 0), [posts]);
  const totalComments = useMemo(() => posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0), [posts]);
  const displayName = profileUser?.displayName || profileUser?.name || profileUser?.username || userName || 'User';
  const username = profileUser?.username || userName || '';
  const bio = String(profileUser?.bio || '').trim();
  const profileImage = profileUser?.profileImage || null;
  const canEditProfile = Boolean(currentUser?.id && currentUser.id === userID);

  useEffect(() => {
    if (!showEditModal) return;
    setEditDisplayName(profileUser?.displayName || profileUser?.name || profileUser?.username || '');
    setEditUsername(profileUser?.username || userName || '');
    setEditBio(String(profileUser?.bio || ''));
    setEditProfileImage(profileUser?.profileImage || null);
  }, [showEditModal, profileUser, userName]);

  const submitProfileUpdate = async () => {
    const updatedUser = await onProfileUpdated?.({
      displayName: editDisplayName,
      username: editUsername,
      bio: editBio,
      profileImage: editProfileImage,
    });
    if (updatedUser) {
      viewModel.updateAuthorProfile?.(updatedUser);
      setShowEditModal(false);
    }
  };

  const tabs = ['active posts', 'about', 'stats'];
  const isDesktop = width >= 900;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profile</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={[styles.pageBody, !isDesktop && styles.pageBodyMobile]}>
        <View style={[styles.leftRail, !isDesktop && styles.leftRailMobile]}>
          <View style={styles.profileCard}>
            <View style={styles.profileTopRow}>
              <View style={styles.avatar}>
                {toImageURI(profileImage) ? (
                  <Image source={{ uri: toImageURI(profileImage) }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitial}>{(displayName || 'U').charAt(0).toUpperCase()}</Text>
                )}
              </View>
            </View>

            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userHandle}>@{username || (displayName || '').replace(/\s+/g, '').toLowerCase()}</Text>

            <View style={styles.bioCard}>
              <Text style={styles.bioLabel}>Description</Text>
              <Text style={styles.bioText}>{bio || 'No description added yet.'}</Text>
            </View>

            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatPill}>
                <Text style={styles.quickStatValue}>{posts.length}</Text>
                <Text style={styles.quickStatLabel}>Posts</Text>
              </View>
              <View style={styles.quickStatPill}>
                <Text style={styles.quickStatValue}>{totalLikes}</Text>
                <Text style={styles.quickStatLabel}>Likes</Text>
              </View>
            </View>

            {canEditProfile ? (
              <TouchableOpacity style={styles.editButton} onPress={() => setShowEditModal(true)}>
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.rightContent}>
          <View style={styles.tabBar}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.toUpperCase()}
                </Text>
                {activeTab === tab && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'active posts' && (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={styles.emptyText}>No active posts yet.</Text>}
              renderItem={({ item }) => (
                <View style={styles.postCard}>
                  <Text style={styles.postTitle}>{item.title}</Text>
                  <Text style={styles.postDescription} numberOfLines={2}>{item.description}</Text>
                  <Text style={styles.postMeta}>❤️ {item.likes} · 💬 {item.comments.length} · {relativeDate(item.createdAt)}</Text>
                </View>
              )}
            />
          )}

          {activeTab === 'about' && (
            <View style={styles.infoPanel}>
              <Text style={styles.infoTitle}>About {displayName}</Text>
              <Text style={styles.infoBody}>
                {bio || 'This user has not added a description yet.'}
              </Text>
            </View>
          )}

          {activeTab === 'stats' && (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalLikes}</Text>
                <Text style={styles.statLabel}>Likes</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalComments}</Text>
                <Text style={styles.statLabel}>Comments</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle}>Edit Profile</Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={styles.editContent}>
            <View style={styles.editImageCard}>
              <View style={styles.editAvatarPreview}>
                {editProfileImage ? (
                  <Image source={{ uri: toImageURI(editProfileImage) }} style={styles.editAvatarImage} />
                ) : (
                  <Text style={styles.editAvatarInitial}>{(editDisplayName || 'U').charAt(0).toUpperCase()}</Text>
                )}
              </View>
                <MediaPicker
                  onImageSelected={(image) => setEditProfileImage(image)}
                  onCancel={() => {}}
                  buttonText={editProfileImage ? '📷  Change Photo' : '📷  Upload Photo'}
                  buttonStyle={styles.uploadButton}
                  buttonTextStyle={styles.uploadButtonText}
                />
            </View>

            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.editInput}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              placeholder="Enter display name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.editInput}
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder="Enter username"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.editInput, styles.editBioInput]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Write a short description"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
            />

            {profileUpdateError ? <Text style={styles.errorText}>{profileUpdateError}</Text> : null}

            <TouchableOpacity
              style={[styles.saveButton, profileUpdateLoading && styles.saveButtonDisabled]}
              onPress={submitProfileUpdate}
              disabled={profileUpdateLoading}
            >
              <Text style={styles.saveButtonText}>{profileUpdateLoading ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  navBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeText: { color: '#2563EB', fontWeight: '700' },
  navTitle: { fontWeight: '700', fontSize: 17, color: '#1D4ED8' },
  pageBody: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  pageBodyMobile: {
    flexDirection: 'column',
  },
  leftRail: {
    width: 320,
    gap: 16,
  },
  leftRailMobile: {
    width: '100%',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  profileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: {
    fontSize: 38,
    fontWeight: '700',
    color: '#2563EB',
  },
  userName: { fontSize: 30, fontWeight: '700', color: '#111827' },
  userHandle: { fontSize: 15, color: '#6B7280' },
  bioCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  bioLabel: { color: '#1D4ED8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  bioText: { color: '#1F2937', fontSize: 14, lineHeight: 20 },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  quickStatPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    gap: 2,
  },
  quickStatValue: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 17,
  },
  quickStatLabel: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
  },
  editButtonText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  modalContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  editContent: { padding: 18, gap: 12 },
  editImageCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  editAvatarPreview: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  editAvatarImage: { width: '100%', height: '100%' },
  editAvatarInitial: { color: '#2563EB', fontSize: 44, fontWeight: '700' },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  uploadButtonText: { color: '#2563EB', fontWeight: '700' },
  rightContent: {
    flex: 1,
    minHeight: 360,
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    flexDirection: 'row',
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabButton: {
    flex: 0,
    marginRight: 12,
    paddingVertical: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
    position: 'relative',
  },
  tabButtonActive: {},
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.6,
  },
  tabTextActive: {
    color: '#1D4ED8',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#2563EB',
    width: '100%',
  },
  listContent: { paddingBottom: 20, gap: 10, paddingTop: 14 },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 14,
    gap: 6,
  },
  postTitle: { fontWeight: '700', color: '#111827', fontSize: 16 },
  postDescription: { color: '#4B5563', fontSize: 13 },
  postMeta: { color: '#6B7280', fontSize: 12 },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 20 },
  infoPanel: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  infoTitle: {
    color: '#1D4ED8',
    fontSize: 18,
    fontWeight: '700',
  },
  infoBody: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  label: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  editInput: {
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
  editBioInput: {
    minHeight: 100,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#FFFFFF', fontWeight: '700' },
  errorText: { color: '#DC2626', fontSize: 12 },
  statsGrid: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: '#1D4ED8',
    fontSize: 26,
    fontWeight: '700',
  },
  statLabel: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default UserProfileView;

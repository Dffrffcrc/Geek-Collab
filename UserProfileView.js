import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';

const relativeDate = (dateStr) => {
  const interval = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (interval < 3600) return 'Now';
  if (interval < 86400) return `${Math.floor(interval / 3600)}h ago`;
  return `${Math.floor(interval / 86400)}d ago`;
};

const UserProfileView = ({ userID, userName, viewModel, onClose }) => {
  const [activeTab, setActiveTab] = useState('posts');
  const { width } = useWindowDimensions();
  const posts = useMemo(() => viewModel.getPostsByAuthor(userID), [viewModel, userID]);
  const totalLikes = useMemo(() => posts.reduce((sum, post) => sum + (post.likes || 0), 0), [posts]);
  const totalComments = useMemo(() => posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0), [posts]);

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
                <Text style={styles.avatarInitial}>{(userName || 'U').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.onlineBadge}>
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>

            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userHandle}>@{(userName || '').replace(/\s+/g, '').toLowerCase()}</Text>

            <TouchableOpacity style={styles.profileActionButton}>
              <Text style={styles.profileActionText}>Preview Public Profile</Text>
            </TouchableOpacity>

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

            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
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
              <Text style={styles.infoTitle}>About {userName}</Text>
              <Text style={styles.infoBody}>
                Passionate collaborator building thoughtful projects and participating in community-driven discussions.
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
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F5' },
  navBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D8',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeText: { color: '#0F766E', fontWeight: '700' },
  navTitle: { fontWeight: '700', fontSize: 17, color: '#111827' },
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
    borderColor: '#E4E4E7',
    borderRadius: 4,
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
    backgroundColor: '#D4D4D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 38,
    fontWeight: '700',
    color: '#3F3F46',
  },
  onlineBadge: {
    borderWidth: 1,
    borderColor: '#34D399',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#ECFDF5',
  },
  onlineText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
  },
  userName: { fontSize: 30, fontWeight: '700', color: '#18181B' },
  userHandle: { fontSize: 15, color: '#71717A' },
  profileActionButton: {
    borderWidth: 1,
    borderColor: '#A1A1AA',
    borderRadius: 4,
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  profileActionText: {
    color: '#3F3F46',
    fontWeight: '600',
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  quickStatPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    gap: 2,
  },
  quickStatValue: {
    color: '#18181B',
    fontWeight: '700',
    fontSize: 17,
  },
  quickStatLabel: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#A1A1AA',
    borderRadius: 4,
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  editButtonText: {
    color: '#3F3F46',
    fontWeight: '600',
  },
  rightContent: {
    flex: 1,
    minHeight: 360,
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D8',
    flexDirection: 'row',
    paddingHorizontal: 12,
    borderRadius: 4,
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
    color: '#71717A',
    letterSpacing: 0.6,
  },
  tabTextActive: {
    color: '#111827',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#10B981',
    width: '100%',
  },
  listContent: { paddingBottom: 20, gap: 10, paddingTop: 14 },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    padding: 14,
    gap: 6,
  },
  postTitle: { fontWeight: '700', color: '#111827', fontSize: 16 },
  postDescription: { color: '#52525B', fontSize: 13 },
  postMeta: { color: '#71717A', fontSize: 12 },
  emptyText: { color: '#71717A', textAlign: 'center', marginTop: 20 },
  infoPanel: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 4,
    padding: 16,
    gap: 8,
  },
  infoTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  infoBody: {
    color: '#52525B',
    fontSize: 14,
    lineHeight: 20,
  },
  statsGrid: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 4,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '700',
  },
  statLabel: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default UserProfileView;

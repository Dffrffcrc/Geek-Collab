// ForumHomeView.js (converted from ForumHomeView.swift)
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useDiscussionViewModel } from '../viewmodels/DiscussionViewModel';
import DiscussionDetailView from './DiscussionDetailView';
import NewDiscussionView from './NewDiscussionView';

const relativeDate = (dateStr) => {
  const interval = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (interval < 3600) return 'Now';
  if (interval < 86400) return `${Math.floor(interval / 3600)}h ago`;
  return `${Math.floor(interval / 86400)}d ago`;
};

// DiscussionCard
const DiscussionCard = ({ discussion, viewModel, currentUser }) => {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={() => setShowDetail(true)} activeOpacity={0.85}>
        {/* Author row */}
        <View style={styles.cardAuthorRow}>
          <View style={styles.cardAuthorAvatar}>
            <Text style={styles.cardAuthorAvatarText}>
              {discussion.authorName[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.cardAuthorName}>{discussion.authorName}</Text>
            <Text style={styles.cardAuthorDate}>{relativeDate(discussion.createdAt)}</Text>
          </View>
        </View>

        {/* Title & Description */}
        <Text style={styles.cardTitle} numberOfLines={2}>{discussion.title}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>{discussion.description}</Text>

        {/* Image */}
        {discussion.image ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${discussion.image}` }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : null}

        {/* Tags */}
        {discussion.tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
            {discussion.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => viewModel.likeDiscussion(discussion.id)}
          >
            <Text style={styles.heartIcon}>❤️</Text>
            <Text style={styles.actionText}>{discussion.likes}</Text>
          </TouchableOpacity>

          <View style={styles.actionItem}>
            <Text style={styles.commentIcon}>💬</Text>
            <Text style={styles.actionText}>{discussion.comments.length}</Text>
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity onPress={() => setShowDetail(true)}>
            <Text style={styles.viewLink}>View</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet">
        <DiscussionDetailView
          discussion={discussion}
          viewModel={viewModel}
          currentUser={currentUser}
          onBack={() => setShowDetail(false)}
        />
      </Modal>
    </>
  );
};

// ForumHomeView
const ForumHomeView = ({ currentUser, onLogout }) => {
  const discussionVM = useDiscussionViewModel();
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>TechCollab</Text>
          <Text style={styles.headerUsername}>@{currentUser.username}</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutIcon}>⬤→</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {discussionVM.filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              discussionVM.selectedFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => discussionVM.filterDiscussions(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                discussionVM.selectedFilter === filter && styles.filterChipTextActive,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Discussion List */}
      <FlatList
        data={discussionVM.filteredDiscussions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DiscussionCard
            discussion={item}
            viewModel={discussionVM}
            currentUser={currentUser}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowNewDiscussion(true)}>
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      {/* New Discussion Modal */}
      <Modal visible={showNewDiscussion} animationType="slide" presentationStyle="pageSheet">
        <NewDiscussionView
          viewModel={discussionVM}
          currentUser={currentUser}
          onDismiss={() => setShowNewDiscussion(false)}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2563EB' },
  headerUsername: { fontSize: 12, color: '#9CA3AF' },
  logoutButton: { padding: 8 },
  logoutIcon: { fontSize: 18, color: '#2563EB' },
  filterRow: { backgroundColor: '#fff', maxHeight: 56 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
  },
  filterChipActive: { backgroundColor: '#2563EB' },
  filterChipText: { fontSize: 13, color: '#374151' },
  filterChipTextActive: { color: '#fff' },
  listContent: { padding: 12, gap: 12 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardAuthorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAuthorAvatarText: { color: '#2563EB', fontWeight: '700', fontSize: 15 },
  cardAuthorName: { fontWeight: '600', fontSize: 14 },
  cardAuthorDate: { fontSize: 11, color: '#9CA3AF' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  cardDescription: { fontSize: 13, color: '#6B7280' },
  cardImage: { width: '100%', height: 150, borderRadius: 8 },
  tagsRow: { marginTop: 2 },
  tag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
  },
  tagText: { fontSize: 11, color: '#2563EB' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heartIcon: { fontSize: 14 },
  commentIcon: { fontSize: 14 },
  actionText: { fontSize: 12, color: '#6B7280' },
  viewLink: { fontSize: 12, color: '#2563EB', fontWeight: '500' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 32 },
});

export default ForumHomeView;

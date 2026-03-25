import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

const relativeDate = (dateStr) => {
  const interval = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (interval < 3600) return 'Now';
  if (interval < 86400) return `${Math.floor(interval / 3600)}h ago`;
  return `${Math.floor(interval / 86400)}d ago`;
};

const UserProfileView = ({ userID, userName, viewModel, onClose }) => {
  const posts = useMemo(() => viewModel.getPostsByAuthor(userID), [viewModel, userID]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profile</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.headerCard}>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.userMeta}>{posts.length} post(s)</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No posts yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <Text style={styles.postTitle}>{item.title}</Text>
            <Text style={styles.postDescription} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.postMeta}>❤️ {item.likes} · 💬 {item.comments.length} · {relativeDate(item.createdAt)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  navBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeText: { color: '#2563EB', fontWeight: '600' },
  navTitle: { fontWeight: '700', fontSize: 16 },
  headerCard: {
    margin: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    gap: 4,
  },
  userName: { fontSize: 18, fontWeight: '700', color: '#1D4ED8' },
  userMeta: { fontSize: 12, color: '#4B5563' },
  listContent: { paddingHorizontal: 12, paddingBottom: 20, gap: 10 },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    gap: 6,
  },
  postTitle: { fontWeight: '700', color: '#111827' },
  postDescription: { color: '#6B7280', fontSize: 13 },
  postMeta: { color: '#9CA3AF', fontSize: 11 },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 20 },
});

export default UserProfileView;

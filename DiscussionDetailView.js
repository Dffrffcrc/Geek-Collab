// DiscussionDetailView.js (converted from DiscussionDetailView.swift)
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { createComment } from '../models/Models';
import uuid from 'react-native-uuid';

const relativeDate = (dateStr) => {
  const interval = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (interval < 3600) return 'Now';
  if (interval < 86400) return `${Math.floor(interval / 3600)}h ago`;
  return `${Math.floor(interval / 86400)}d ago`;
};

const DiscussionDetailView = ({ discussion, viewModel, currentUser, onBack }) => {
  const [newCommentText, setNewCommentText] = useState('');

  const addComment = () => {
    if (!newCommentText.trim()) return;
    const comment = createComment({
      id: uuid.v4(),
      authorID: currentUser.id,
      authorName: currentUser.username,
      text: newCommentText,
      createdAt: new Date().toISOString(),
    });
    viewModel.addComment(discussion.id, comment);
    setNewCommentText('');
  };

  // Get the latest version of the discussion from viewModel
  const liveDiscussion =
    viewModel.discussions.find((d) => d.id === discussion.id) || discussion;

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Discussion</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Author */}
        <View style={styles.authorBox}>
          <Text style={styles.authorName}>{liveDiscussion.authorName}</Text>
          <Text style={styles.authorDate}>{relativeDate(liveDiscussion.createdAt)}</Text>
        </View>

        {/* Title & Content */}
        <View style={styles.section}>
          <Text style={styles.title}>{liveDiscussion.title}</Text>
          <Text style={styles.content}>{liveDiscussion.content}</Text>
        </View>

        {/* Image */}
        {liveDiscussion.image ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${liveDiscussion.image}` }}
            style={styles.postImage}
            resizeMode="cover"
          />
        ) : null}

        {/* Tags */}
        {liveDiscussion.tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
            {liveDiscussion.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.divider} />

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeader}>
            Comments ({liveDiscussion.comments.length})
          </Text>
          {liveDiscussion.comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                <Text style={styles.commentDate}>{relativeDate(comment.createdAt)}</Text>
              </View>
              <Text style={styles.commentText}>{comment.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.commentInputRow}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          value={newCommentText}
          onChangeText={setNewCommentText}
          multiline={false}
        />
        <TouchableOpacity
          onPress={addComment}
          disabled={!newCommentText.trim()}
          style={[styles.sendButton, !newCommentText.trim() && styles.sendButtonDisabled]}
        >
          <Text style={styles.sendIcon}>✈</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { color: '#2563EB', fontSize: 16 },
  navTitle: { fontWeight: '600', fontSize: 16 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  authorBox: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  authorName: { fontWeight: '600', fontSize: 14 },
  authorDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  section: { gap: 8 },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { fontSize: 15, lineHeight: 22, color: '#374151' },
  postImage: { width: '100%', height: 250, borderRadius: 8 },
  tagsRow: { marginVertical: 4 },
  tag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  tagText: { fontSize: 12, color: '#2563EB' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  commentsSection: { gap: 12 },
  commentsHeader: { fontWeight: '600', fontSize: 15 },
  commentCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthor: { fontWeight: '600', fontSize: 12 },
  commentDate: { fontSize: 11, color: '#9CA3AF' },
  commentText: { fontSize: 14, color: '#374151' },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#93C5FD' },
  sendIcon: { color: '#fff', fontSize: 16 },
});

export default DiscussionDetailView;

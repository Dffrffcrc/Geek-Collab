 
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { createComment } from './Models';
import uuid from 'react-native-uuid';

const toImageURI = (image) => {
  if (!image) return null;
  if (typeof image === 'string') return `data:image/jpeg;base64,${image}`;
  if (image.base64) return `data:image/jpeg;base64,${image.base64}`;
  return null;
};

const getAspectRatio = (image) => {
  if (image && typeof image === 'object' && image.width && image.height) {
    return image.width / image.height;
  }
  return 4 / 3;
};

const relativeDate = (dateStr) => {
  const interval = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (interval < 3600) return 'Now';
  if (interval < 86400) return `${Math.floor(interval / 3600)}h ago`;
  return `${Math.floor(interval / 86400)}d ago`;
};

const DiscussionDetailView = ({ discussion, viewModel, currentUser, onBack, onOpenProfile }) => {
  const [newCommentText, setNewCommentText] = useState('');
  const permissions = viewModel.getPermissionSummary(currentUser);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!viewModel.toast?.id) return;
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [viewModel.toast?.id, toastOpacity, viewModel.toast]);

  const addComment = () => {
    if (!newCommentText.trim()) return;
    const comment = createComment({
      id: uuid.v4(),
      authorID: currentUser.id,
      authorName: currentUser.username,
      text: newCommentText,
      createdAt: new Date().toISOString(),
    });
    viewModel.addComment(discussion.id, comment, currentUser);
    setNewCommentText('');
  };

  const confirmDeletePost = () => {
    if (Platform.OS === 'web') {
      const accepted = typeof window !== 'undefined'
        ? window.confirm('Delete Post\n\nThis will permanently remove this post.')
        : false;
      if (!accepted) return;

      Promise.resolve(viewModel.deleteDiscussion(liveDiscussion.id, currentUser))
        .then((deleted) => {
          if (deleted) {
            onBack();
          } else if (typeof window !== 'undefined') {
            window.alert('You may not have permission to delete this post.');
          }
        })
        .catch(() => {
          if (typeof window !== 'undefined') {
            window.alert('Something went wrong while deleting this post.');
          }
        });
      return;
    }

    Alert.alert('Delete Post', 'This will permanently remove this post.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const deleted = await Promise.resolve(viewModel.deleteDiscussion(liveDiscussion.id, currentUser));
            if (deleted) {
              onBack();
            } else {
              Alert.alert('Delete not applied', 'You may not have permission to delete this post.');
            }
          } catch {
            Alert.alert('Delete failed', 'Something went wrong while deleting this post.');
          }
        },
      },
    ]);
  };

  // Get the latest version of the discussion from viewModel
  const liveDiscussion =
    viewModel.discussions.find((d) => d.id === discussion.id) || discussion;

  return (
    <SafeAreaView style={styles.container}>
      {viewModel.toast?.message ? (
        <Animated.View
          style={[
            styles.toastTop,
            (viewModel.toast?.type === 'report' || viewModel.toast?.type === 'danger') && styles.toastTopReport,
            { opacity: toastOpacity },
          ]}
        >
          <Text style={styles.toastTopText}>{viewModel.toast.message}</Text>
        </Animated.View>
      ) : null}

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
          <TouchableOpacity onPress={() => onOpenProfile?.(liveDiscussion.authorID, liveDiscussion.authorName)}>
            <Text style={styles.authorName}>{liveDiscussion.authorName}</Text>
          </TouchableOpacity>
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
            source={{ uri: toImageURI(liveDiscussion.image) }}
            style={[styles.postImage, { aspectRatio: getAspectRatio(liveDiscussion.image) }]}
            resizeMode="contain"
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

        <View style={styles.detailActionsRow}>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => viewModel.reportDiscussion(liveDiscussion.id, currentUser.id, 'User report')}
          >
            <Text style={styles.outlineButtonText}>Report Post</Text>
          </TouchableOpacity>

          {permissions.canModerate && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={confirmDeletePost}
            >
              <Text style={styles.deleteButtonText}>Delete Post</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeader}>
            Comments ({liveDiscussion.comments.length})
          </Text>
          {liveDiscussion.comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <TouchableOpacity onPress={() => onOpenProfile?.(comment.authorID, comment.authorName)}>
                  <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                </TouchableOpacity>
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
          placeholder={
            permissions.canPostOrComment
              ? 'Add a comment...'
              : 'Read-only / muted / banned'
          }
          placeholderTextColor="#B6BFCC"
          value={newCommentText}
          onChangeText={setNewCommentText}
          multiline={false}
          editable={permissions.canPostOrComment}
        />
        <TouchableOpacity
          onPress={addComment}
          disabled={!newCommentText.trim() || !permissions.canPostOrComment}
          style={[
            styles.sendButton,
            (!newCommentText.trim() || !permissions.canPostOrComment) && styles.sendButtonDisabled,
          ]}
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
  postImage: {
    width: '100%',
    maxHeight: 420,
    minHeight: 180,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
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
  detailActionsRow: { flexDirection: 'row', gap: 10 },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  outlineButtonText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  deleteButton: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: { color: '#B91C1C', fontSize: 12, fontWeight: '700' },
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
  toastTop: {
    position: 'absolute',
    top: 72,
    alignSelf: 'center',
    zIndex: 20,
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 18,
    minWidth: 260,
    alignItems: 'center',
  },
  toastTopReport: {
    backgroundColor: '#DC2626',
  },
  toastTopText: { color: '#F9FAFB', fontWeight: '800', fontSize: 19, textAlign: 'center' },
});

export default DiscussionDetailView;

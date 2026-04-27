 
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
  Modal,
  Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { createComment } from './Models';
import { hasModerationMatch } from './ContentModeration';
import uuid from 'react-native-uuid';

// Reddit-inspired colors
const Colors = {
  primary: '#2563EB',
  surface: '#FFFFFF',
  surfaceHover: '#F3F4F6',
  background: '#F9FAFB',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  success: '#16A34A',
  successLight: '#DCFCE7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
};

const Spacing = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
  full: 9999,
};

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

const REPORT_REASON_OPTIONS = [
  'Spam or scam',
  'Harassment or hate',
  'Violence or dangerous content',
  'False information',
  'Copyright or IP concern',
  'Other',
];

const DiscussionDetailView = ({ discussion, viewModel, currentUser, onBack, onOpenProfile }) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASON_OPTIONS[0]);
  const [reportCustomText, setReportCustomText] = useState('');
  const permissions = viewModel.getPermissionSummary(currentUser);
  const commentHasBlockedLanguage = hasModerationMatch(newCommentText, viewModel.blockedWords);
  const canSendComment = Boolean(newCommentText.trim() && permissions.canPostOrComment && !commentHasBlockedLanguage);
  const canSubmitReport = reportReason !== 'Other' || Boolean(reportCustomText.trim());
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
    if (!canSendComment) return;
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

  const submitReport = () => {
    if (!canSubmitReport) return;
    const trimmedCustom = reportCustomText.trim();
    const finalReason = reportReason === 'Other'
      ? `Other: ${trimmedCustom}`
      : (trimmedCustom ? `${reportReason} (${trimmedCustom})` : reportReason);
    viewModel.reportDiscussion(liveDiscussion.id, currentUser.id, finalReason);
    setShowReportModal(false);
    setReportReason(REPORT_REASON_OPTIONS[0]);
    setReportCustomText('');
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
  const userHasReported = Array.isArray(liveDiscussion.reports)
    ? liveDiscussion.reports.some((report) => report.reporterID === currentUser.id)
    : false;

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
          <Markdown style={styles.markdownContentStyles}>
            {liveDiscussion.content || ''}
          </Markdown>
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
          {!userHasReported ? (
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => setShowReportModal(true)}
            >
              <Text style={styles.outlineButtonText}>Report Post</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => viewModel.unreportDiscussion(liveDiscussion.id, currentUser.id)}
            >
              <Text style={styles.outlineButtonText}>Undo My Report</Text>
            </TouchableOpacity>
          )}

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

      <Modal visible={showReportModal} animationType="slide" transparent>
        <View style={styles.reportModalBackdrop}>
          <View style={styles.reportModalCard}>
            <Text style={styles.reportModalTitle}>Report Post</Text>
            <Text style={styles.reportModalSubtitle}>Select a reason</Text>

            <View style={styles.reasonChipsRow}>
              {REPORT_REASON_OPTIONS.map((option) => {
                const isActive = reportReason === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.reasonChip, isActive && styles.reasonChipActive]}
                    onPress={() => setReportReason(option)}
                  >
                    <Text style={[styles.reasonChipText, isActive && styles.reasonChipTextActive]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.reportCustomLabel}>Custom details (optional)</Text>
            <TextInput
              style={styles.reportCustomInput}
              placeholder={reportReason === 'Other' ? 'Required for Other reason' : 'Add extra context'}
              placeholderTextColor="#B6BFCC"
              value={reportCustomText}
              onChangeText={setReportCustomText}
              multiline
              textAlignVertical="top"
            />

            {reportReason === 'Other' && !reportCustomText.trim() ? (
              <Text style={styles.validationText}>Please provide a custom reason for Other.</Text>
            ) : null}

            <View style={styles.reportActionsRow}>
              <TouchableOpacity
                style={styles.reportCancelButton}
                onPress={() => {
                  setShowReportModal(false);
                  setReportReason(REPORT_REASON_OPTIONS[0]);
                  setReportCustomText('');
                }}
              >
                <Text style={styles.reportCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportSubmitButton, !canSubmitReport && styles.reportSubmitButtonDisabled]}
                onPress={submitReport}
                disabled={!canSubmitReport}
              >
                <Text style={styles.reportSubmitButtonText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Comment Input */}
      <View style={styles.commentInputRow}>
        <View style={styles.commentInputInnerRow}>
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
            disabled={!canSendComment}
            style={[
              styles.sendButton,
              !canSendComment && styles.sendButtonDisabled,
            ]}
          >
            <Text style={styles.sendIcon}>✈</Text>
          </TouchableOpacity>
        </View>
        {commentHasBlockedLanguage ? (
          <Text style={styles.validationText}>Blocked language detected in comment.</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  navTitle: { fontWeight: '700', fontSize: 16 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg },
  authorBox: {
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  authorName: { fontWeight: '700', fontSize: 14 },
  authorDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  section: { gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  markdownContentStyles: {
    body: { color: Colors.textSecondary, fontSize: 15, lineHeight: 24 },
    heading1: { color: Colors.textPrimary, fontSize: 28, fontWeight: '800', marginVertical: 10 },
    heading2: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginVertical: 8 },
    heading3: { color: Colors.textPrimary, fontSize: 20, fontWeight: '600', marginVertical: 6 },
    blockquote: { borderLeftWidth: 3, borderLeftColor: Colors.border, paddingLeft: 12, color: Colors.textSecondary },
    code_inline: { backgroundColor: Colors.background, color: Colors.textPrimary, paddingHorizontal: 6, borderRadius: 4 },
    fence: { backgroundColor: Colors.textPrimary, color: Colors.surface, borderRadius: 8, padding: 12, fontFamily: 'monospace' },
    link: { color: Colors.primary, textDecorationLine: 'underline' },
  },
  postImage: {
    width: '100%',
    maxHeight: 500,
    minHeight: 200,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
  },
  tagsRow: { marginVertical: 8 },
  tag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    marginRight: 8,
  },
  tagText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  detailActionsRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  outlineButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  outlineButtonText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  deleteButton: {
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.dangerLight,
  },
  deleteButtonText: { color: Colors.danger, fontSize: 13, fontWeight: '700' },
  commentsSection: { gap: 12 },
  commentsHeader: { fontWeight: '700', fontSize: 15, color: Colors.textPrimary },
  commentCard: {
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthor: { fontWeight: '600', fontSize: 13 },
  commentDate: { fontSize: 11, color: Colors.textMuted },
  commentText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  commentInputRow: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentInputInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
    fontSize: 15,
    backgroundColor: Colors.surface,
  },
  validationText: { color: Colors.danger, fontSize: 12, marginHorizontal: 2 },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  sendButtonDisabled: { backgroundColor: '#93C5FD' },
  sendIcon: { color: Colors.surface, fontSize: 16 },
  toastTop: {
    position: 'absolute',
    top: 72,
    alignSelf: 'center',
    zIndex: 20,
    backgroundColor: Colors.textPrimary,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 18,
    minWidth: 260,
    alignItems: 'center',
  },
  toastTopReport: {
    backgroundColor: Colors.danger,
  },
  toastTopText: { color: Colors.surface, fontWeight: '800', fontSize: 19, textAlign: 'center' },
  reportModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  reportModalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  reportModalTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  reportModalSubtitle: { fontSize: 13, color: Colors.textMuted },
  reasonChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  reasonChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  reasonChipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  reasonChipTextActive: { color: Colors.primary, fontWeight: '600' },
  reportCustomLabel: { fontSize: 13, color: Colors.textMuted },
  reportCustomInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    backgroundColor: Colors.background,
  },
  reportActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  reportCancelButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reportCancelButtonText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  reportSubmitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  reportSubmitButtonDisabled: { backgroundColor: '#93C5FD' },
  reportSubmitButtonText: { color: Colors.surface, fontSize: 13, fontWeight: '600' },
});

export default DiscussionDetailView;

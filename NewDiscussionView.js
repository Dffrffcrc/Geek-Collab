 
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
import Markdown from 'react-native-markdown-display';
import MediaPicker from './MediaPicker';
import { hasModerationMatch } from './ContentModeration';

const NewDiscussionView = ({ viewModel, currentUser, onDismiss }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [tags, setTags] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const initialOpenForumID = (viewModel.openForums && viewModel.openForums.length > 0)
    ? viewModel.openForums[0].id
    : viewModel.selectedForumID || null;
  const [selectedForumID, setSelectedForumID] = useState(initialOpenForumID);
  const permissions = viewModel.getPermissionSummary(currentUser);
  const selectedForum = (viewModel.forums || []).find((f) => f.id === selectedForumID) || viewModel.activeForum || null;
  const selectedForumIsReadOnly = Boolean(
    !selectedForum || selectedForum.isReadOnly || (selectedForum.expiresAt && new Date(selectedForum.expiresAt).getTime() <= Date.now())
  );
  const canPostToSelectedForum = !selectedForumIsReadOnly && !permissions.isMuted && !permissions.isBanned;
  const hasBlockedLanguage =
    hasModerationMatch(title, viewModel.blockedWords) ||
    hasModerationMatch(description, viewModel.blockedWords) ||
    hasModerationMatch(content, viewModel.blockedWords) ||
    hasModerationMatch(tags, viewModel.blockedWords);
  const canSubmit = Boolean(title.trim() && content.trim() && canPostToSelectedForum && !hasBlockedLanguage);

  const postDiscussion = () => {
    if (!canSubmit) return;
    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const created = viewModel.createDiscussion(
      title,
      description,
      content,
      selectedImage,
      tagArray,
      currentUser,
      selectedForumID
    );
    if (created) {
      onDismiss();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={onDismiss}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>New Discussion</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.forumMetaBox}>
          <Text style={styles.forumMetaText}>
            {viewModel.activeForum?.title || 'No active forum'} · {viewModel.forumIsReadOnly ? 'Read-only' : 'Open'} · {viewModel.forumCountdown}
          </Text>
        </View>

        {(viewModel.openForums || []).length > 0 && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Post to forum</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.forumSelectRow}>
                {(viewModel.openForums || []).map((forum) => {
                  const isSelected = selectedForumID === forum.id;
                  return (
                    <TouchableOpacity
                      key={forum.id}
                      style={[styles.forumSelectChip, isSelected && styles.forumSelectChipActive]}
                      onPress={() => setSelectedForumID(forum.id)}
                    >
                      <Text style={[styles.forumSelectText, isSelected && styles.forumSelectTextActive]}>
                        {forum.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Title"
            placeholderTextColor="#B6BFCC"
            value={title}
            onChangeText={setTitle}
          />
          {hasModerationMatch(title, viewModel.blockedWords) ? (
            <Text style={styles.validationText}>Blocked language detected in title.</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Brief Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief description"
            placeholderTextColor="#B6BFCC"
            value={description}
            onChangeText={setDescription}
          />
          {hasModerationMatch(description, viewModel.blockedWords) ? (
            <Text style={styles.validationText}>Blocked language detected in description.</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Content</Text>
          <TouchableOpacity
            style={styles.previewToggleButton}
            onPress={() => setShowMarkdownPreview((prev) => !prev)}
          >
            <Text style={styles.previewToggleText}>{showMarkdownPreview ? 'Hide Markdown Preview' : 'Show Markdown Preview'}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.textArea}
            placeholder="Write your discussion content here... (Markdown supported)"
            placeholderTextColor="#B6BFCC"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
          {showMarkdownPreview ? (
            <View style={styles.markdownPreviewCard}>
              <Text style={styles.markdownPreviewLabel}>Preview</Text>
              <Markdown style={styles.markdownBodyStyles}>
                {content.trim() || '*Nothing to preview yet.*'}
              </Markdown>
            </View>
          ) : null}
          {hasModerationMatch(content, viewModel.blockedWords) ? (
            <Text style={styles.validationText}>Blocked language detected in content.</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Tags (comma separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. SwiftUI, React, AI"
            placeholderTextColor="#B6BFCC"
            value={tags}
            onChangeText={setTags}
            autoCapitalize="none"
          />
          {hasModerationMatch(tags, viewModel.blockedWords) ? (
            <Text style={styles.validationText}>Blocked language detected in tags.</Text>
          ) : null}
        </View>

        {hasBlockedLanguage ? (
          <Text style={styles.validationText}>Posting is blocked until all flagged words are removed.</Text>
        ) : null}

        {/* Image Picker */}
        <View style={styles.fieldGroup}>
          <MediaPicker
            onImageSelected={(image) => setSelectedImage(image)}
            onCancel={() => {}}
          />
          {selectedImage && (
            <>
              <Text style={styles.imageAdded}>✓ Image added</Text>
              <Image
                source={{ uri: `data:image/jpeg;base64,${selectedImage.base64}` }}
                style={styles.imagePreview}
                resizeMode="contain"
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* Post Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.postButton,
            !canSubmit && styles.postButtonDisabled,
          ]}
          onPress={postDiscussion}
          disabled={!canSubmit}
        >
          <Text style={styles.postButtonText}>Post</Text>
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
  cancelButton: { color: '#2563EB', fontSize: 16 },
  navTitle: { fontWeight: '600', fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  forumMetaBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
  },
  forumMetaText: { color: '#1D4ED8', fontSize: 12, fontWeight: '600' },
  forumSelectRow: { flexDirection: 'row', gap: 8 },
  forumSelectChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
  },
  forumSelectChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  forumSelectText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  forumSelectTextActive: { color: '#1D4ED8' },
  fieldGroup: { gap: 6 },
  label: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
    backgroundColor: '#F9FAFB',
  },
  previewToggleButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewToggleText: { color: '#1D4ED8', fontSize: 12, fontWeight: '600' },
  markdownPreviewCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 6,
  },
  markdownPreviewLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  markdownBodyStyles: {
    body: { color: '#374151', fontSize: 14, lineHeight: 21 },
    heading1: { color: '#111827', fontSize: 24, fontWeight: '700' },
    heading2: { color: '#111827', fontSize: 20, fontWeight: '700' },
    bullet_list: { marginVertical: 2 },
    ordered_list: { marginVertical: 2 },
    code_inline: { backgroundColor: '#F3F4F6', color: '#111827', paddingHorizontal: 4 },
    fence: { backgroundColor: '#111827', color: '#F9FAFB', borderRadius: 6, padding: 8 },
    link: { color: '#2563EB' },
  },
  validationText: { fontSize: 12, color: '#DC2626' },
  imageAdded: { fontSize: 12, color: '#16A34A', marginTop: 4 },
  imagePreview: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  postButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  postButtonDisabled: { backgroundColor: '#93C5FD' },
  postButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

export default NewDiscussionView;

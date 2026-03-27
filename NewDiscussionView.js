 
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
import MediaPicker from './MediaPicker';

const NewDiscussionView = ({ viewModel, currentUser, onDismiss }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
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

  const postDiscussion = () => {
    if (!title.trim() || !content.trim() || !canPostToSelectedForum) return;
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
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Content</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Write your discussion content here..."
            placeholderTextColor="#B6BFCC"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
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
        </View>

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
            (!title.trim() || !content.trim() || !canPostToSelectedForum) && styles.postButtonDisabled,
          ]}
          onPress={postDiscussion}
          disabled={!title.trim() || !content.trim() || !canPostToSelectedForum}
        >
          <Text style={styles.postButtonText}>{canPostToSelectedForum ? 'Post' : 'Posting disabled'}</Text>
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

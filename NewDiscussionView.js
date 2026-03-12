// NewDiscussionView.js (converted from NewDiscussionView.swift)
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
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

  const postDiscussion = () => {
    if (!title.trim() || !content.trim()) return;
    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    viewModel.createDiscussion(title, description, content, selectedImage, tagArray, currentUser);
    onDismiss();
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
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Brief Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief description"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Content</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Write your discussion content here..."
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
            value={tags}
            onChangeText={setTags}
            autoCapitalize="none"
          />
        </View>

        {/* Image Picker */}
        <View style={styles.fieldGroup}>
          <MediaPicker
            onImageSelected={(base64) => setSelectedImage(base64)}
            onCancel={() => {}}
          />
          {selectedImage && (
            <Text style={styles.imageAdded}>✓ Image added</Text>
          )}
        </View>
      </ScrollView>

      {/* Post Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.postButton,
            (!title.trim() || !content.trim()) && styles.postButtonDisabled,
          ]}
          onPress={postDiscussion}
          disabled={!title.trim() || !content.trim()}
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

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ProfileEditView = ({ currentUser, authVM, onClose, onSaveProfile }) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName || currentUser.username || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [profileImage, setProfileImage] = useState(currentUser.profileImage || null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result?.split(',')[1];
          if (base64) {
            setProfileImage(base64);
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      // For native, would need expo-image-picker
      // Placeholder for now
      console.log('Image picker not implemented for native yet');
    }
  };

  const removeImage = () => {
    setProfileImage(null);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveMessage('');

    try {
      const success = await authVM.updateProfile({
        displayName,
        bio,
        profileImage,
      });

      if (success) {
        setSaveMessage('Profile saved successfully!');
        setTimeout(() => {
          setSaveMessage('');
          onClose?.();
          onSaveProfile?.();
        }, 1500);
      } else {
        setSaveMessage('Failed to save profile. Try again.');
      }
    } catch (error) {
      setSaveMessage('Error saving profile.');
      console.error('Profile save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const profileImageURI = profileImage
    ? typeof profileImage === 'string'
      ? profileImage.startsWith('data:')
        ? profileImage
        : `data:image/jpeg;base64,${profileImage}`
      : null
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
          <Text style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}>
            {isLoading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Picture Section */}
        <View style={styles.pictureSection}>
          {profileImageURI ? (
            <Image source={{ uri: profileImageURI }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person-circle" size={80} color="#D1D5DB" />
            </View>
          )}
          <View style={styles.pictureButtonsRow}>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload Photo</Text>
            </TouchableOpacity>
            {profileImageURI && (
              <TouchableOpacity style={[styles.uploadButton, styles.removeButton]} onPress={removeImage}>
                <Ionicons name="trash-outline" size={16} color="#fff" />
                <Text style={styles.uploadButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Display Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. John Smith"
            placeholderTextColor="#B6BFCC"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            maxLength={50}
          />
          <Text style={styles.helperText}>This is how others see you (max 50 characters)</Text>
        </View>

        {/* Username (Read-only) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username</Text>
          <View style={styles.readOnlyInput}>
            <Text style={styles.readOnlyText}>@{currentUser.username}</Text>
          </View>
          <Text style={styles.helperText}>Cannot be changed</Text>
        </View>

        {/* Bio */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell others about yourself (optional)"
            placeholderTextColor="#B6BFCC"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.helperText}>{bio.length}/200 characters</Text>
        </View>

        {/* Save Message */}
        {saveMessage && (
          <View style={[styles.messageBox, saveMessage.includes('success') ? styles.successBox : styles.errorBox]}>
            <Text style={styles.messageText}>{saveMessage}</Text>
          </View>
        )}

        {/* Save Button (Bottom) */}
        <TouchableOpacity
          style={[styles.saveButtonLarge, isLoading && styles.saveButtonLargeDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonLargeText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: { fontWeight: '700', fontSize: 16, color: '#111827' },
  cancelButton: { color: '#6B7280', fontWeight: '600', fontSize: 16 },
  saveButton: { color: '#2563EB', fontWeight: '600', fontSize: 16 },
  saveButtonDisabled: { opacity: 0.5 },
  content: { paddingHorizontal: 16, paddingVertical: 20, gap: 20 },
  pictureSection: { alignItems: 'center', gap: 12 },
  profileImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E5E7EB' },
  profileImagePlaceholder: { justifyContent: 'center', alignItems: 'center', width: 120, height: 120 },
  pictureButtonsRow: { flexDirection: 'row', gap: 8 },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  removeButton: { backgroundColor: '#EF4444' },
  uploadButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  bioInput: { height: 100 },
  readOnlyInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
  },
  readOnlyText: { color: '#6B7280', fontSize: 15 },
  helperText: { fontSize: 11, color: '#9CA3AF' },
  messageBox: { padding: 12, borderRadius: 8, marginBottom: 10 },
  successBox: { backgroundColor: '#DCFCE7' },
  errorBox: { backgroundColor: '#FEE2E2' },
  messageText: { fontSize: 13, fontWeight: '600', color: '#15803D', textAlign: 'center' },
  saveButtonLarge: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonLargeDisabled: { opacity: 0.6 },
  saveButtonLargeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default ProfileEditView;

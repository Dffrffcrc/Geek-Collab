 
// Uses react-native-image-picker (install: npm install react-native-image-picker)
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

/**
 * MediaPicker - allows user to select an image from the photo library.
 *
 * Props:
 *   onImageSelected: (image: {base64: string, width?: number, height?: number}) => void
 *   onCancel: () => void
 *   children: optional custom trigger element
 */
const MediaPicker = ({ onImageSelected, onCancel, children }) => {
  const openPicker = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.8,
        selectionLimit: 1,
      },
      (response) => {
        if (response.didCancel) {
          onCancel?.();
          return;
        }
        if (response.errorCode) {
          console.error('ImagePicker error:', response.errorMessage);
          onCancel?.();
          return;
        }
        const asset = response.assets?.[0];
        if (asset?.base64) {
          onImageSelected({
            base64: asset.base64,
            width: asset.width,
            height: asset.height,
            mimeType: asset.type || 'image/jpeg',
          });
        }
      }
    );
  };

  if (children) {
    return (
      <Pressable onPress={openPicker}>
        {children}
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.button} onPress={openPicker}>
      <Text style={styles.buttonText}>📷  Add Image</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  buttonText: { fontSize: 15, color: '#374151' },
});

export default MediaPicker;

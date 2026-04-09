import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const fileToImageData = async (file) => {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : '');
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  return {
    base64,
    uri: `data:${file.type || 'image/jpeg'};base64,${base64}`,
    width: undefined,
    height: undefined,
    mimeType: file.type || 'image/jpeg',
  };
};

const MediaPicker = ({ onImageSelected, onCancel, children }) => {
  const inputRef = React.useRef(null);

  const openPicker = () => {
    inputRef.current?.click();
  };

  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      onCancel?.();
      return;
    }

    try {
      const imageData = await fileToImageData(file);
      onImageSelected?.(imageData);
    } catch (error) {
      console.error('ImagePicker error:', error);
      onCancel?.();
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={styles.hiddenInput}
        onChange={handleChange}
      />
      {children ? (
        <TouchableOpacity onPress={openPicker}>
          {children}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={openPicker}>
          <Text style={styles.buttonText}>📷  Add Image</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  hiddenInput: {
    display: 'none',
  },
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
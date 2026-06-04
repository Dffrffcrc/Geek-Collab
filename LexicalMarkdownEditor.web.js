import React from 'react';
import { TextInput } from 'react-native';

const LexicalMarkdownEditor = ({ value, onChange, placeholder, style, maxLength = 20000 }) => {
  return (
    <TextInput
      style={style}
      placeholder={placeholder}
      placeholderTextColor="#B6BFCC"
      value={value}
      onChangeText={onChange}
      maxLength={maxLength}
      multiline
      textAlignVertical="top"
      autoCorrect={false}
      autoCapitalize="none"
    />
  );
};

export default LexicalMarkdownEditor;

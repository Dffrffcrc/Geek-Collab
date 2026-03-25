import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

const FAQS = [
  {
    question: 'Who can create forums?',
    answer: 'Only Admin users can create a short-term forum and set the expiry duration.',
  },
  {
    question: 'What happens when a forum expires?',
    answer: 'The forum automatically switches to read-only mode. Users can still view content but cannot post/comment.',
  },
  {
    question: 'What can Moderators do?',
    answer: 'Moderators can delete posts, report posts, and temporarily mute users. They cannot create forums.',
  },
  {
    question: 'What can Admins do?',
    answer: 'Admins can create forums, delete posts, temporarily mute users, and ban users.',
  },
  {
    question: 'How does the word filter work?',
    answer: 'A built-in dictionary filters blocked words in posts/comments and replaces them automatically.',
  },
  {
    question: 'Can I upload images?',
    answer: 'Yes. When creating a discussion, use the image picker to attach a photo.',
  },
];

const FAQView = ({ onClose }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <Text style={styles.title}>FAQ</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {FAQS.map((item) => (
          <View key={item.question} style={styles.card}>
            <Text style={styles.question}>{item.question}</Text>
            <Text style={styles.answer}>{item.answer}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  navBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeText: { color: '#2563EB', fontWeight: '600' },
  content: { padding: 16, gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  question: { fontWeight: '700', color: '#111827', marginBottom: 6 },
  answer: { color: '#374151', lineHeight: 20 },
});

export default FAQView;

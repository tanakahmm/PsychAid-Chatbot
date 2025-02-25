import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface QuickRepliesProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export function QuickReplies({ suggestions = [], onSelect }: QuickRepliesProps) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {suggestions.map((text, index) => (
        <TouchableOpacity
          key={index}
          style={styles.button}
          onPress={() => onSelect(text)}
        >
          <Text style={styles.buttonText}>{text}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 50,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 8,
    gap: 8,
  },
  button: {
    backgroundColor: '#E9E9EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  buttonText: {
    color: '#007AFF',
    fontSize: 14,
  },
});
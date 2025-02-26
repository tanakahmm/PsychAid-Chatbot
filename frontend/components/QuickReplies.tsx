import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

export interface QuickRepliesProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export const QuickReplies: React.FC<QuickRepliesProps> = ({ suggestions, onSelect }) => (
  <View style={styles.quickRepliesContainer}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {suggestions.map((suggestion, index) => (
        <TouchableOpacity
          key={index}
          style={styles.quickReplyButton}
          onPress={() => onSelect(suggestion)}
        >
          <Text style={styles.quickReplyText}>{suggestion}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  quickRepliesContainer: {
    padding: 16,
  },
  quickReplyButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9E9EB',
    borderRadius: 16,
    marginRight: 8,
  },
  quickReplyText: {
    fontSize: 16,
  },
}); 
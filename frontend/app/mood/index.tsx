import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const MOODS = [
  { emoji: '😊', label: 'Happy', color: '#FFD700' },
  { emoji: '😔', label: 'Sad', color: '#4169E1' },
  { emoji: '😰', label: 'Anxious', color: '#9932CC' },
  { emoji: '😡', label: 'Angry', color: '#FF4500' },
  { emoji: '😐', label: 'Neutral', color: '#808080' },
];

export default function MoodScreen() {
  const handleMoodSelect = (mood: string) => {
    router.replace({
      pathname: '/(tabs)',
      params: { initialMessage: `I'm feeling ${mood.toLowerCase()}`, fromMood: 'true' }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How are you feeling today?</Text>
      
      <View style={styles.moodGrid}>
        {MOODS.map((mood, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.moodButton, { backgroundColor: mood.color }]}
            onPress={() => handleMoodSelect(mood.label)}
          >
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <Text style={styles.moodLabel}>{mood.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#333',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  moodButton: {
    width: '40%',
    aspectRatio: 1,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  moodEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
}); 
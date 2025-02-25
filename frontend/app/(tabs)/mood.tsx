import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiService } from '../../services/api';

const MOODS = [
  { emoji: '😊', label: 'Happy', color: '#FFD700' },
  { emoji: '😌', label: 'Calm', color: '#90EE90' },
  { emoji: '😐', label: 'Neutral', color: '#E0E0E0' },
  { emoji: '😔', label: 'Sad', color: '#87CEEB' },
  { emoji: '😰', label: 'Anxious', color: '#FFA07A' },
  { emoji: '😤', label: 'Angry', color: '#FF6B6B' },
];

export default function MoodScreen() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveMood = async () => {
    if (selectedMood === null) return;
    
    setIsSaving(true);
    try {
      const moodData = {
        mood: MOODS[selectedMood].label,
        note: note.trim(),
        timestamp: new Date(),
      };
      
      await ApiService.saveMoodEntry(moodData);
      
      // Reset form
      setSelectedMood(null);
      setNote('');
      Alert.alert('Success', 'Your mood has been saved!');
    } catch (error) {
      console.error('Error saving mood:', error);
      Alert.alert('Error', 'Failed to save your mood. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>How are you feeling?</Text>
      
      <ScrollView style={styles.content}>
        <View style={styles.moodGrid}>
          {MOODS.map((mood, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.moodItem,
                selectedMood === index && styles.selectedMood,
                { backgroundColor: mood.color + '40' },
              ]}
              onPress={() => setSelectedMood(index)}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>Add a note (optional)</Text>
          <TextInput
            style={styles.noteInput}
            multiline
            numberOfLines={4}
            value={note}
            onChangeText={setNote}
            placeholder="How are you feeling today? What's on your mind?"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!selectedMood || isSaving) && styles.saveButtonDisabled
          ]}
          onPress={handleSaveMood}
          disabled={!selectedMood || isSaving}
        >
          {isSaving ? (
            <Text style={styles.saveButtonText}>Saving...</Text>
          ) : (
            <>
              <Ionicons name="save-outline" size={24} color="white" />
              <Text style={styles.saveButtonText}>Save Entry</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  moodItem: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMood: {
    borderColor: '#007AFF',
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  noteSection: {
    marginBottom: 24,
  },
  noteLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 
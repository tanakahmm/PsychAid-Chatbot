import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TherapeuticExercise } from '../components/TherapeuticExercise';
import { api } from '../services/api';

interface Exercise {
  id: string;
  name: string;
  description: string;
  steps: string[];
  duration: number;
  difficulty: string;
}

interface ExerciseCategory {
  [key: string]: Exercise[];
}

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState<ExerciseCategory>({});
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const response = await api.get('/therapeutic-exercises');
      setExercises(response.data.exercises);
      setCategories(Object.keys(response.data.exercises));
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={styles.exerciseItem}
      onPress={() => setSelectedExercise(item)}
    >
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Ionicons name="chevron-forward" size={24} color="#7f8c8d" />
      </View>
      <Text style={styles.exerciseDescription}>{item.description}</Text>
      <View style={styles.exerciseFooter}>
        <Text style={styles.durationText}>{item.duration} min</Text>
        <Text style={styles.difficultyText}>{item.difficulty}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCategorySection = ({ item: category }: { item: string }) => (
    <View style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
      <FlatList
        data={exercises[category]}
        renderItem={renderExerciseItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.exerciseList}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedExercise ? (
        <View style={styles.exerciseContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedExercise(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
            <Text style={styles.backButtonText}>Back to Exercises</Text>
          </TouchableOpacity>
          <TherapeuticExercise
            exercise={selectedExercise}
            onComplete={() => setSelectedExercise(null)}
          />
        </View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategorySection}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  exerciseList: {
    paddingRight: 16,
  },
  exerciseItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
    lineHeight: 20,
  },
  exerciseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  difficultyText: {
    fontSize: 14,
    color: '#7f8c8d',
    textTransform: 'capitalize',
  },
  exerciseContainer: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  backButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 8,
  },
}); 
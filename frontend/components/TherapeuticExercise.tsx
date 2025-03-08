import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/api';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Exercise {
  id: string;
  name: string;
  description: string;
  steps: string[];
  duration: number;
  difficulty: string;
  category: string;
}

interface TherapeuticExerciseProps {
  exercise: Exercise;
  onComplete?: () => void;
}

export const TherapeuticExercise: React.FC<TherapeuticExerciseProps> = ({ exercise, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(exercise.duration * 60);
  const [showTimer, setShowTimer] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      handleExerciseComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleExerciseComplete = async () => {
    try {
      // Get user ID from storage
      const userId = await AsyncStorage.getItem('user_id');
      console.log('Retrieved user ID:', userId);

      if (!userId) {
        console.error('No user ID found in storage');
        Alert.alert('Error', 'Please log in to save your progress');
        return;
      }

      // Calculate completed duration
      const completedDuration = Math.floor(Math.max(0, exercise.duration - timeLeft / 60));
      console.log('Calculated duration:', completedDuration);

      // Create progress data object
      const progressData = {
        type: 'exercise',
        category: exercise.category || 'general',
        duration: completedDuration,
        timestamp: new Date().toISOString(),
        exercise_id: exercise.id,
        user_id: userId
      };

      // Debug log
      console.log('Exercise data:', exercise);
      console.log('Progress data to be sent:', progressData);

      // Save progress using ApiService
      const result = await ApiService.saveProgress(progressData);

      console.log('Progress saved successfully:', result);

      Alert.alert(
        "Exercise Complete",
        "Great job! Your progress has been updated.",
        [{ text: "OK", onPress: () => {
          if (onComplete) onComplete();
        }}]
      );

    } catch (error: any) {
      console.error('Error completing exercise:', error);
      Alert.alert(
        "Error",
        "Failed to save progress. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const nextStep = () => {
    if (currentStep < exercise.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowTimer(true);
      setIsActive(true);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{exercise.name}</Text>
      <Text style={styles.description}>{exercise.description}</Text>
      
      {!showTimer ? (
        <View style={styles.stepsContainer}>
          <Text style={styles.stepTitle}>Step {currentStep + 1} of {exercise.steps.length}</Text>
          <Text style={styles.stepText}>{exercise.steps[currentStep]}</Text>
          
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.button, currentStep === 0 && styles.buttonDisabled]}
              onPress={previousStep}
              disabled={currentStep === 0}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={nextStep}>
              <Text style={styles.buttonText}>
                {currentStep === exercise.steps.length - 1 ? 'Start Timer' : 'Next Step'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={() => setIsActive(!isActive)}
          >
            <Text style={styles.buttonText}>
              {isActive ? 'Pause' : 'Resume'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.difficultyContainer}>
        <Text style={styles.difficultyText}>
          Difficulty: {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
        </Text>
        <Text style={styles.durationText}>
          Duration: {exercise.duration} minutes
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  description: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  stepsContainer: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#34495e',
  },
  stepText: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 20,
    lineHeight: 24,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  stopButton: {
    backgroundColor: '#e74c3c',
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  difficultyText: {
    color: '#7f8c8d',
    fontSize: 14,
  },
  durationText: {
    color: '#7f8c8d',
    fontSize: 14,
  },
}); 
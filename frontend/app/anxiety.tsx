import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ApiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TimerState {
  duration: number;
  isActive: boolean;
  timeLeft: number;
}

export default function AnxietyScreen() {
  const [showTimer, setShowTimer] = useState(false);
  const [timer, setTimer] = useState<TimerState>({
    duration: 180,
    isActive: false,
    timeLeft: 180,
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const celebrationValue = useRef(new Animated.Value(0)).current;

  const presetDurations = [
    { label: '3 min', seconds: 180 },
    { label: '5 min', seconds: 300 },
    { label: '10 min', seconds: 600 },
    { label: '15 min', seconds: 900 },
  ];

  const quotes = [
    {
      text: "Anxiety is a thin stream of fear trickling through the mind. If encouraged, it cuts a channel into which all other thoughts are drained.",
      author: "Arthur Somers Roche"
    },
    {
      text: "You don't have to control your thoughts. You just have to stop letting them control you.",
      author: "Dan Millman"
    },
    {
      text: "Nothing diminishes anxiety faster than action.",
      author: "Walter Anderson"
    },
    {
      text: "Anxiety does not empty tomorrow of its sorrows, but only empties today of its strength.",
      author: "Charles Spurgeon"
    }
  ];

  const [currentQuote, setCurrentQuote] = useState(quotes[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(prevQuote => {
        const currentIndex = quotes.findIndex(q => q.text === prevQuote.text);
        const nextIndex = (currentIndex + 1) % quotes.length;
        return quotes[nextIndex];
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const setDuration = (seconds: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimer({
      duration: seconds,
      isActive: false,
      timeLeft: seconds,
    });
  };

  const startCelebrationAnimation = () => {
    celebrationValue.setValue(0);
    Animated.sequence([
      Animated.timing(celebrationValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(celebrationValue, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  };

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setTimer(prev => ({ ...prev, isActive: true }));
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev.timeLeft <= 1) {
          clearInterval(timerRef.current!);
          handleTimerComplete();
          return { ...prev, isActive: false, timeLeft: prev.duration };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimer(prev => ({ ...prev, isActive: false }));
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimer(prev => ({ ...prev, isActive: false, timeLeft: prev.duration }));
  };

  const handleTimerComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    startCelebrationAnimation();
    
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        Alert.alert(
          "Error",
          "Please log in to save your progress",
          [{ text: "OK", onPress: () => setShowTimer(false) }]
        );
        return;
      }

      // Calculate completed duration in minutes
      const completedSeconds = timer.duration - timer.timeLeft;
      const completedDuration = Math.ceil(completedSeconds / 60);
      console.log('Completed duration (minutes):', completedDuration);
      
      // Save progress for anxiety management
      await ApiService.saveProgress({
        type: 'exercise',
        category: 'anxiety-management',
        duration: completedDuration,
        timestamp: new Date().toISOString(),
        user_id: userId
      });
      
      Alert.alert(
        "Exercise Complete",
        "Great job! Your anxiety management session has been recorded.",
        [{ text: "OK", onPress: () => {
          setShowTimer(false);
          // Reset timer state
          setTimer(prev => ({
            ...prev,
            isActive: false,
            timeLeft: prev.duration
          }));
        }}]
      );
    } catch (error: any) {
      console.error('Error saving progress:', error);
      
      // More specific error message
      const errorMessage = error.response?.data?.detail || 
        error.message || 
        'Failed to save your progress. Please try again.';
      
      Alert.alert(
        "Error",
        errorMessage,
        [{ 
          text: "OK",
          onPress: () => {
            setShowTimer(false);
            // Reset timer state even on error
            setTimer(prev => ({
              ...prev,
              isActive: false,
              timeLeft: prev.duration
            }));
          }
        }]
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2196F3', '#1976D2']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.push('/explore')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Anxiety Management</Text>
          <Text style={styles.headerSubtitle}>Find your calm</Text>
        </View>
      </LinearGradient>

      <View style={styles.quoteContainer}>
        <Text style={styles.quoteText}>{currentQuote.text}</Text>
        <Text style={styles.quoteAuthor}>- {currentQuote.author}</Text>
      </View>

      <ScrollView style={styles.content}>
        <Image
          source={require('../assets/images/anxiety.jpeg')}
          style={styles.image}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Understanding Anxiety</Text>
          <Text style={styles.description}>
            Anxiety is your body's natural response to stress. Learning to manage anxiety 
            involves understanding your triggers and developing healthy coping mechanisms. 
            Through guided exercises and breathing techniques, you can learn to control 
            anxiety symptoms and lead a more balanced life.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coping Techniques</Text>
          <View style={styles.benefitsList}>
            <Text style={styles.benefitItem}>• Deep breathing exercises</Text>
            <Text style={styles.benefitItem}>• Progressive muscle relaxation</Text>
            <Text style={styles.benefitItem}>• Mindful grounding techniques</Text>
            <Text style={styles.benefitItem}>• Positive self-talk</Text>
            <Text style={styles.benefitItem}>• Regular physical exercise</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => setShowTimer(true)}
        >
          <Text style={styles.startButtonText}>Start Breathing Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showTimer}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTimer(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Animated.View style={[
              styles.celebration,
              {
                transform: [
                  {
                    scale: celebrationValue.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 1.2, 1]
                    })
                  }
                ],
                opacity: celebrationValue
              }
            ]}>
              <Ionicons name="star" size={100} color="#FFD700" />
              <Text style={styles.celebrationText}>Great Job!</Text>
            </Animated.View>
            
            <Text style={styles.timerText}>{formatTime(timer.timeLeft)}</Text>
            
            {!timer.isActive && (
              <View style={styles.presetContainer}>
                {presetDurations.map((preset, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.presetButton,
                      timer.duration === preset.seconds && styles.presetButtonActive
                    ]}
                    onPress={() => setDuration(preset.seconds)}
                  >
                    <Text style={[
                      styles.presetButtonText,
                      timer.duration === preset.seconds && styles.presetButtonTextActive
                    ]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            <View style={styles.timerControls}>
              <TouchableOpacity
                style={styles.timerButton}
                onPress={timer.isActive ? pauseTimer : startTimer}
              >
                <Ionicons
                  name={timer.isActive ? "pause" : "play"}
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.timerButton}
                onPress={resetTimer}
              >
                <Ionicons name="refresh" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowTimer(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity 
        style={styles.chatButton}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.chatButtonText}>Navigate to Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  benefitsList: {
    marginTop: 8,
  },
  benefitItem: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    color: '#333',
  },
  startButton: {
    backgroundColor: '#2196F3',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 24,
  },
  timerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  timerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#333',
  },
  chatButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quoteContainer: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#1565C0',
    lineHeight: 24,
    textAlign: 'center',
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#1976D2',
    textAlign: 'right',
    marginTop: 8,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  presetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  presetButtonActive: {
    backgroundColor: '#2196F3',
  },
  presetButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  presetButtonTextActive: {
    color: '#fff',
  },
  celebration: {
    position: 'absolute',
    top: '20%',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  celebrationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
}); 
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

export default function StressScreen() {
  const [showTimer, setShowTimer] = useState(false);
  const [timer, setTimer] = useState<TimerState>({
    duration: 300,
    isActive: false,
    timeLeft: 300,
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const celebrationValue = useRef(new Animated.Value(0)).current;

  const presetDurations = [
    { label: '5 min', seconds: 300 },
    { label: '10 min', seconds: 600 },
    { label: '15 min', seconds: 900 },
    { label: '20 min', seconds: 1200 },
  ];

  const quotes = [
    {
      text: "The greatest weapon against stress is our ability to choose one thought over another.",
      author: "William James"
    },
    {
      text: "It's not stress that kills us, it is our reaction to it.",
      author: "Hans Selye"
    },
    {
      text: "Within you, there is a stillness and a sanctuary to which you can retreat at any time.",
      author: "Hermann Hesse"
    },
    {
      text: "The time to relax is when you don't have time for it.",
      author: "Sydney J. Harris"
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
      
      // Save progress for stress relief
      await ApiService.saveProgress({
        type: 'exercise',
        category: 'stress-relief',
        duration: completedDuration,
        timestamp: new Date().toISOString(),
        user_id: userId
      });
      
      Alert.alert(
        "Exercise Complete",
        "Great job! Your stress relief session has been recorded.",
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

  // Add cleanup on unmount
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
        colors={['#009688', '#00796B']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.push('/explore')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Stress Relief</Text>
          <Text style={styles.headerSubtitle}>Find your balance</Text>
        </View>
      </LinearGradient>

      <View style={styles.quoteContainer}>
        <Text style={styles.quoteText}>{currentQuote.text}</Text>
        <Text style={styles.quoteAuthor}>- {currentQuote.author}</Text>
      </View>

      <ScrollView style={styles.content}>
        <Image
          source={require('../assets/images/stress.jpeg')}
          style={styles.image}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Understanding Stress</Text>
          <Text style={styles.description}>
            Stress is your body's natural response to challenging situations. While some stress 
            can be motivating, chronic stress can impact your physical and mental well-being. 
            Learning to manage stress effectively is crucial for maintaining good health.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stress Relief Techniques</Text>
          <View style={styles.benefitsList}>
            <Text style={styles.benefitItem}>• Deep breathing exercises</Text>
            <Text style={styles.benefitItem}>• Progressive muscle relaxation</Text>
            <Text style={styles.benefitItem}>• Mindful walking</Text>
            <Text style={styles.benefitItem}>• Visualization</Text>
            <Text style={styles.benefitItem}>• Gentle stretching</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => setShowTimer(true)}
        >
          <Text style={styles.startButtonText}>Start Stress Relief Exercise</Text>
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
              <Text style={styles.celebrationText}>Stay Calm!</Text>
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
    color: '#FFCCBC',
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
    backgroundColor: '#4CAF50',
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
    color: '#4CAF50',
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
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#009688',
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
    backgroundColor: '#E0F2F1',
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
    color: '#00695C',
    lineHeight: 24,
    textAlign: 'center',
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#00796B',
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
    borderColor: '#009688',
  },
  presetButtonActive: {
    backgroundColor: '#009688',
  },
  presetButtonText: {
    color: '#009688',
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
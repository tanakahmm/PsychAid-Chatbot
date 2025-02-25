import React, { useState, useEffect } from 'react';
import { View, Animated, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface BreathingExerciseProps {
  breatheInDuration?: number;
  breatheOutDuration?: number;
  totalDuration?: number;
}

export function BreathingExercise({ 
  breatheInDuration = 4,
  breatheOutDuration = 4,
  totalDuration = 5 
}: BreathingExerciseProps) {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [timeLeft, setTimeLeft] = useState(totalDuration * 60);
  const animation = new Animated.Value(1);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const cycleBreathing = () => {
      setPhase('inhale');
      Animated.timing(animation, {
        toValue: 1.5,
        duration: breatheInDuration * 1000,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        setPhase('hold');
        setTimeout(() => {
          setPhase('exhale');
          Animated.timing(animation, {
            toValue: 1,
            duration: breatheOutDuration * 1000,
            useNativeDriver: true,
          }).start(() => {
            if (isActive) cycleBreathing();
          });
        }, 2000);
      }, breatheInDuration * 1000);
    };

    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      cycleBreathing();
    }

    return () => {
      clearInterval(timer);
    };
  }, [isActive, breatheInDuration, breatheOutDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
      
      <Animated.View
        style={[
          styles.circle,
          {
            transform: [{ scale: animation }],
            backgroundColor: phase === 'inhale' ? '#4CAF50' : 
                          phase === 'hold' ? '#FFA726' : '#2196F3',
          },
        ]}
      >
        <Text style={styles.phaseText}>
          {phase === 'inhale' ? 'Breathe In' : 
           phase === 'hold' ? 'Hold' : 'Breathe Out'}
        </Text>
      </Animated.View>

      <TouchableOpacity
        style={[styles.button, isActive && styles.stopButton]}
        onPress={() => setIsActive(!isActive)}
      >
        <Ionicons
          name={isActive ? 'stop' : 'play'}
          size={24}
          color="#fff"
        />
        <Text style={styles.buttonText}>
          {isActive ? 'Stop' : 'Start'} Exercise
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  timer: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  phaseText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

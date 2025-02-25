import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CircularProgress } from 'react-native-circular-progress';

interface MeditationTimerProps {
  duration: number;
  onComplete: () => void;
}

export function MeditationTimer({ duration, onComplete }: MeditationTimerProps) {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsActive(false);
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <CircularProgress
        size={250}
        width={15}
        fill={progress}
        tintColor="#007AFF"
        backgroundColor="#e3e3e3"
      >
        {() => (
          <Text style={styles.timerText}>
            {formatTime(timeLeft)}
          </Text>
        )}
      </CircularProgress>

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
          {isActive ? 'Stop' : 'Start'} Meditation
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
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 40,
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

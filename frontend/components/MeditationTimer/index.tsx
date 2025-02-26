import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CircularProgress } from 'react-native-circular-progress';

interface MeditationTimerProps {
  duration: number;
  onComplete: () => void;
  type?: string;
}

export function MeditationTimer({ duration, onComplete, type = 'Meditation' }: MeditationTimerProps) {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isPaused, setIsPaused] = useState(false);
  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;

  // Reset timer when duration changes
  useEffect(() => {
    setTimeLeft(duration * 60);
  }, [duration]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isActive && !isPaused && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsActive(false);
            setIsPaused(false);
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isActive, isPaused, timeLeft, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this session?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End',
          style: 'destructive',
          onPress: () => {
            setIsActive(false);
            setIsPaused(false);
            setTimeLeft(duration * 60);
          },
        },
      ],
    );
  };

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    setTimeLeft(duration * 60);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{type} Session</Text>
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

      <View style={styles.buttonContainer}>
        {!isActive ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={handleStart}
          >
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, styles.pauseButton]}
              onPress={handlePauseResume}
            >
              <Ionicons name={isPaused ? "play" : "pause"} size={24} color="#fff" />
              <Text style={styles.buttonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={handleStop}
            >
              <Ionicons name="stop" size={24} color="#fff" />
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    minWidth: 120,
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  pauseButton: {
    backgroundColor: '#FFA000',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

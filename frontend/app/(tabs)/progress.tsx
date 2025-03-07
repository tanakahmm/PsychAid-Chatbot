import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../../services/api';
import { useFocusEffect } from '@react-navigation/native';

interface MoodData {
  mood: string;
  note: string;
  timestamp: string;
}

interface MoodEntry {
  _id: string;
  mood: MoodData;
  note: string;
  timestamp: string;
  user_id: string;
}

interface Activity {
  category: string;
  duration: number;
  timestamp: string;
  completed: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: string;
  timestamp: string;
  icon: string;
}

interface ProgressData {
  totalMinutes: number;
  totalSessions: number;
  streak: number;
  moodHistory: MoodEntry[];
  recentActivities: Activity[];
  achievements: Achievement[];
}

export default function ProgressScreen() {
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadMoodHistory = async () => {
    try {
      console.log('Starting to load mood history...');
      setIsLoading(true);
      setError(null);
      
      // Check if user is logged in
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('user_id');
      
      console.log('Auth check:', { hasToken: !!token, hasUserId: !!userId });
      
      if (!token || !userId) {
        console.log('No token or user ID found');
        setError('Please log in to view your mood history');
        setIsLoading(false);
        return;
      }

      console.log('Loading mood history for user:', userId);
      const history = await ApiService.getMoodHistory();
      console.log('Mood history loaded:', history);
      
      if (!Array.isArray(history)) {
        console.error('Invalid history data received:', history);
        setError('Unable to load mood history. Please try again later.');
        setMoodHistory([]);
      } else {
        console.log(`Received ${history.length} mood entries`);
        // Sort history by timestamp in descending order (newest first)
        const sortedHistory = history.sort((a, b) => 
          new Date(b.mood.timestamp).getTime() - new Date(a.mood.timestamp).getTime()
        );
        setMoodHistory(sortedHistory);
      }
    } catch (error: any) {
      console.error('Error loading mood history:', {
        error,
        status: error.response?.status,
        message: error.response?.data?.detail || error.message,
        data: error.response?.data
      });
      
      if (error.message?.includes('Session expired')) {
        setError('Your session has expired. Please log in again.');
      } else if (error.response?.status === 404) {
        setError('No mood history found. Start tracking your mood to see your progress!');
      } else if (error.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Unable to load mood history at this time. Please try again later.');
      }
      setMoodHistory([]);
    } finally {
      console.log('Finished loading mood history');
      setIsLoading(false);
    }
  };

  // Load data when component mounts
  useEffect(() => {
    console.log('Progress screen mounted, loading mood history...');
    loadMoodHistory();
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Progress screen focused, reloading mood history...');
      loadMoodHistory();
    }, [])
  );

  const getMoodColor = (mood: string): string => {
    const colors: { [key: string]: string } = {
      'Happy': '#4CAF50',
      'Calm': '#2196F3',
      'Neutral': '#9E9E9E',
      'Sad': '#FFC107',
      'Anxious': '#FF9800',
      'Angry': '#F44336',
    };
    return colors[mood] || '#9E9E9E';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderQuickStats = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.quickStats}>
        <View style={styles.quickStatItem}>
          <Ionicons name="time-outline" size={32} color="#4CAF50" />
          <Text style={styles.quickStatValue}>{moodHistory.length * 30}</Text>
          <Text style={styles.quickStatLabel}>Minutes</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Ionicons name="calendar-outline" size={32} color="#2196F3" />
          <Text style={styles.quickStatValue}>{moodHistory.length}</Text>
          <Text style={styles.quickStatLabel}>Sessions</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Ionicons name="flame-outline" size={32} color="#FF9800" />
          <Text style={styles.quickStatValue}>{moodHistory.length}</Text>
          <Text style={styles.quickStatLabel}>Day Streak</Text>
        </View>
      </View>
    </View>
  );

  const renderMoodHistory = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Mood History</Text>
      {moodHistory && moodHistory.length > 0 ? (
        moodHistory.map((entry, index) => (
          <View key={entry._id || index} style={styles.moodEntry}>
            <View style={[styles.moodIndicator, { backgroundColor: getMoodColor(entry.mood.mood) }]} />
            <View style={styles.moodContent}>
              <Text style={styles.moodText}>{entry.mood.mood}</Text>
              {entry.mood.note && entry.mood.note !== "" && (
                <Text style={styles.moodNote}>{entry.mood.note}</Text>
              )}
              <Text style={styles.moodTime}>{formatDate(entry.mood.timestamp)}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No mood entries recorded yet</Text>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading progress data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadMoodHistory}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {renderQuickStats()}
        {renderMoodHistory()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  moodEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
  },
  moodIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  moodContent: {
    flex: 1,
  },
  moodText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  moodNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  moodTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 
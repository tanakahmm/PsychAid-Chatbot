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
  RefreshControl,
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

interface Exercise {
  _id: string;
  name: string;
  duration: number;
  timestamp: string;
  completed: boolean;
  category: string;
}

interface Achievement {
  _id: string;
  title: string;
  description: string;
  timestamp: string;
  exerciseId: string;
  category: string;
  duration: number;
}

interface ChildProgress {
  id: string;
  name: string;
  totalTime: number;
  achievements: Achievement[];
  dayStreak: number;
  moodHistory: MoodEntry[];
}

interface User {
  user_type: 'parent' | 'student';
  name: string;
  email: string;
}

export default function ProgressScreen() {
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [dayStreak, setDayStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isParent, setIsParent] = useState(false);
  const [childrenProgress, setChildrenProgress] = useState<ChildProgress[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const loadProgressData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setIsLoading(true);
      }
      setError(null);
      
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('user_id');
      const userJson = await AsyncStorage.getItem('user');
      
      if (!token || !userId) {
        setError('Please log in to view your progress');
        return;
      }

      // Load user type and check if parent
      let currentUser: User | null = null;
      if (userJson) {
        try {
          currentUser = JSON.parse(userJson);
          if (currentUser && 'user_type' in currentUser) {
            setIsParent(currentUser.user_type === 'parent');
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }

      // Load data in parallel
      const [moodHistoryData, achievementsData, exercisesData] = await Promise.all([
        ApiService.getMoodHistory(),
        ApiService.getAchievements(),
        ApiService.getExercises()
      ]);

      // Update state with fetched data
      if (Array.isArray(moodHistoryData)) {
        const sortedHistory = moodHistoryData.sort((a, b) => 
          new Date(b.mood.timestamp).getTime() - new Date(a.mood.timestamp).getTime()
        );
        setMoodHistory(sortedHistory);
        setDayStreak(calculateDayStreak(sortedHistory));
      }

      if (Array.isArray(achievementsData)) {
        setAchievements(achievementsData);
        setTotalTime(calculateTotalTime(achievementsData));
      }

      if (Array.isArray(exercisesData)) {
        setExercises(exercisesData);
      }

      // Load children's progress if parent
      if (currentUser?.user_type === 'parent') {
        try {
          const children = await ApiService.getLinkedChildren();
          if (children.length === 0) {
            setChildrenProgress([]);
            return;
          }

          // Load all children's data in parallel
          const progressPromises = children.map(async (child) => {
            try {
              const [childAchievements, childMoodHistory] = await Promise.all([
                ApiService.getChildAchievements(child.id),
                ApiService.getChildMoodHistory(child.id)
              ]);

              return {
                id: child.id,
                name: child.name,
                totalTime: childAchievements.totalMinutes || 0,
                achievements: childAchievements.achievements || [],
                dayStreak: calculateDayStreak(childMoodHistory),
                moodHistory: childMoodHistory
              } as ChildProgress;
            } catch (childError) {
              console.error('Error loading child progress:', child.name, childError);
              return null;
            }
          });
          
          const progress = (await Promise.all(progressPromises))
            .filter((p): p is ChildProgress => p !== null);
          setChildrenProgress(progress);
        } catch (parentError) {
          console.error('Error loading children data:', parentError);
          setChildrenProgress([]);
        }
      }

    } catch (error: any) {
      console.error('Error loading progress data:', error);
      setError('Unable to load progress data. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    loadProgressData();
  }, [loadProgressData]);

  // Handle screen focus
  useFocusEffect(
    useCallback(() => {
      loadProgressData(true);
    }, [loadProgressData])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadProgressData(true);
  }, [loadProgressData]);

  const calculateDayStreak = (moodEntries: MoodEntry[]) => {
    if (!moodEntries.length) return 0;
    
    const sortedEntries = [...moodEntries].sort((a, b) => 
      new Date(b.mood.timestamp).getTime() - new Date(a.mood.timestamp).getTime()
    );

    let streak = 1;
    let currentDate = new Date(sortedEntries[0].mood.timestamp);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < sortedEntries.length; i++) {
      const entryDate = new Date(sortedEntries[i].mood.timestamp);
      entryDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
        currentDate = entryDate;
      } else if (diffDays > 1) {
        break;
      }
    }

    return streak;
  };

  const calculateTotalTime = (achievements: Achievement[]) => {
    return achievements.reduce((total, achievement) => total + (achievement.duration || 0), 0);
  };

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

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    const icons: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      'meditation': 'leaf-outline',
      'anxiety-management': 'heart-outline',
      'sleep-hygiene': 'moon-outline',
      'stress-relief': 'water-outline',
      'self-care': 'happy-outline',
    };
    return icons[category] || 'trophy-outline';
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

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const renderQuickStats = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.quickStats}>
        <View style={styles.quickStatItem}>
          <Ionicons name="time-outline" size={32} color="#4CAF50" />
          <Text style={styles.quickStatValue}>{formatDuration(totalTime)}</Text>
          <Text style={styles.quickStatLabel}>Total Time</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Ionicons name="trophy-outline" size={32} color="#2196F3" />
          <Text style={styles.quickStatValue}>{achievements.length}</Text>
          <Text style={styles.quickStatLabel}>Achievements</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Ionicons name="flame-outline" size={32} color="#FF9800" />
          <Text style={styles.quickStatValue}>{dayStreak}</Text>
          <Text style={styles.quickStatLabel}>Day Streak</Text>
        </View>
      </View>
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Achievements</Text>
      {achievements.length > 0 ? (
        achievements.map((achievement, index) => (
          <View key={achievement._id || index} style={styles.achievementEntry}>
            <View style={[styles.achievementIcon, { backgroundColor: getCategoryColor(achievement.category) }]}>
              <Ionicons name={getCategoryIcon(achievement.category)} size={24} color="#fff" />
            </View>
            <View style={styles.achievementContent}>
              <Text style={styles.achievementTitle}>{achievement.title}</Text>
              <Text style={styles.achievementDescription}>{achievement.description}</Text>
              <Text style={styles.achievementTime}>
                {formatDate(achievement.timestamp)} • {formatDuration(achievement.duration)}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No achievements yet</Text>
      )}
    </View>
  );

  const renderChildProgress = (child: ChildProgress) => (
    <View key={child.id} style={styles.section}>
      <Text style={styles.sectionTitle}>{child.name}'s Progress</Text>
      <View style={styles.quickStats}>
        <View style={styles.quickStatItem}>
          <Ionicons name="time-outline" size={32} color="#4CAF50" />
          <Text style={styles.quickStatValue}>{formatDuration(child.totalTime)}</Text>
          <Text style={styles.quickStatLabel}>Total Time</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Ionicons name="trophy-outline" size={32} color="#2196F3" />
          <Text style={styles.quickStatValue}>{child.achievements.length}</Text>
          <Text style={styles.quickStatLabel}>Achievements</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Ionicons name="flame-outline" size={32} color="#FF9800" />
          <Text style={styles.quickStatValue}>{child.dayStreak}</Text>
          <Text style={styles.quickStatLabel}>Day Streak</Text>
        </View>
      </View>
      {child.moodHistory.length > 0 && (
        <View style={styles.childMoodHistory}>
          <Text style={styles.subsectionTitle}>Recent Moods</Text>
          {child.moodHistory.slice(0, 3).map((entry, index) => (
            <View key={index} style={styles.moodEntry}>
              <View style={[styles.moodIndicator, { backgroundColor: getMoodColor(entry.mood.mood) }]} />
              <View style={styles.moodContent}>
                <Text style={styles.moodText}>{entry.mood.mood}</Text>
                {entry.mood.note && entry.mood.note !== "" && (
                  <Text style={styles.moodNote}>{entry.mood.note}</Text>
                )}
                <Text style={styles.moodTime}>{formatDate(entry.mood.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
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

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      'meditation': '#4CAF50',
      'anxiety-management': '#2196F3',
      'sleep-hygiene': '#673AB7',
      'stress-relief': '#FF9800',
      'self-care': '#E91E63',
    };
    return colors[category] || '#9E9E9E';
  };

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
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
          />
        }
      >
        {renderQuickStats()}
        {renderAchievements()}
        {renderMoodHistory()}
        {isParent && childrenProgress.map(child => renderChildProgress(child))}
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
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
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
  achievementEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  achievementTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  childMoodHistory: {
    marginTop: 16,
  },
}); 
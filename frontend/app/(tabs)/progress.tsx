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
  totalSessions: number;
  categories: CategoryProgress[];
  dayStreak: number;
  moodHistory: MoodEntry[];
}

interface User {
  user_type: 'parent' | 'student';
  name: string;
  email: string;
}

interface CategoryProgress {
  category: string;
  totalSessions: number;
  totalMinutes: number;
  lastSession: string | null;
}

interface WeeklyProgress {
  date: string;
  totalMinutes: number;
  sessions: number;
}

export default function ProgressScreen() {
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [dayStreak, setDayStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isParent, setIsParent] = useState(false);
  const [childrenProgress, setChildrenProgress] = useState<ChildProgress[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([]);
  const router = useRouter();

  const loadProgressData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setIsLoading(true);
      }
      setError(null);

      const userJson = await AsyncStorage.getItem('user');
      const currentUser = userJson ? JSON.parse(userJson) : null;

      // Set parent status
      setIsParent(currentUser?.user_type === 'parent');

      if (currentUser?.user_type === 'parent') {
        console.log('[Progress] Loading parent view...');
        // Fetch linked children data
        const children = await ApiService.getLinkedChildren();
        console.log('[Progress] Found children:', children);

        if (children && children.length > 0) {
          const childrenProgressData = await Promise.all(
            children.map(async (child) => {
              console.log(`[Progress] Fetching data for child: ${child.name} (${child.id})`);
              
              // Get child's mood history only
              const childMoodHistory = await ApiService.getChildMoodHistory(child.id);
              console.log(`[Progress] Child mood history:`, childMoodHistory);

              return {
                id: child.id,
                name: child.name,
                totalSessions: 0,
                categories: [],
                dayStreak: calculateDayStreak(childMoodHistory || []),
                moodHistory: childMoodHistory || []
              };
            })
          );

          console.log('[Progress] Setting children progress:', childrenProgressData);
          setChildrenProgress(childrenProgressData);
        } else {
          console.log('[Progress] No linked children found');
          setChildrenProgress([]);
        }
      }

      // Load user's own progress data
      const categories = ['meditation', 'anxiety-management', 'sleep-hygiene', 'stress-relief', 'self-care'];
      const [moodHistoryData, ...categoryData] = await Promise.all([
        ApiService.getMoodHistory(),
        ...categories.map(category => ApiService.getProgressByCategory(category))
      ]);

      // Update mood history and streak
      if (Array.isArray(moodHistoryData)) {
        const sortedHistory = moodHistoryData.sort((a, b) => 
          new Date(b.mood.timestamp).getTime() - new Date(a.mood.timestamp).getTime()
        );
        setMoodHistory(sortedHistory);
        setDayStreak(calculateDayStreak(sortedHistory));
      }

      // Process category progress data
      const formattedCategoryProgress = categories.map((category, index) => ({
        category,
        totalSessions: Number(categoryData[index]?.total_sessions || 0),
        totalMinutes: Number(categoryData[index]?.total_minutes || 0),
        lastSession: categoryData[index]?.last_session || null
      }));

      setCategoryProgress(formattedCategoryProgress);
      
      // Update total time
      const totalTimeFromCategories = formattedCategoryProgress.reduce(
        (sum, cat) => sum + cat.totalMinutes, 
        0
      );
      setTotalTime(totalTimeFromCategories);

    } catch (error: any) {
      console.error('[Progress] Error loading progress data:', error);
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

    // Check if the most recent entry is from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (currentDate.getTime() < today.getTime()) {
      return 0; // Streak is broken if no entry today
    }

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
          <Ionicons name="calendar-outline" size={32} color="#2196F3" />
          <Text style={styles.quickStatValue}>
            {categoryProgress.reduce((sum, cat) => sum + cat.totalSessions, 0)}
          </Text>
          <Text style={styles.quickStatLabel}>Total Sessions</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Ionicons name="flame-outline" size={32} color="#FF9800" />
          <Text style={styles.quickStatValue}>{dayStreak}</Text>
          <Text style={styles.quickStatLabel}>Day Streak</Text>
        </View>
      </View>
      </View>
    );

  const renderChildProgress = (child: ChildProgress) => (
    <View key={child.id} style={styles.section}>
      <Text style={styles.sectionTitle}>{child.name}'s Recent Moods</Text>
      {/* Child's Recent Moods */}
      {child.moodHistory && child.moodHistory.length > 0 ? (
        <View style={styles.childMoodHistory}>
          {child.moodHistory.slice(0, 5).map((entry, index) => (
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
      ) : (
        <Text style={styles.emptyText}>No mood entries yet</Text>
      )}
    </View>
  );

  const renderMoodHistory = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Moods</Text>
      {moodHistory.slice(0, 5).map((entry, index) => (
        <View key={index} style={styles.moodEntry}>
          <View style={[styles.moodIndicator, { backgroundColor: getMoodColor(entry.mood.mood) }]} />
          <View style={styles.moodContent}>
            <Text style={styles.moodText}>{entry.mood.mood}</Text>
            {entry.mood.note && (
              <Text style={styles.moodNote}>{entry.mood.note}</Text>
            )}
            <Text style={styles.moodTime}>{formatDate(entry.mood.timestamp)}</Text>
          </View>
        </View>
      ))}
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

  const renderCategoryProgress = () => (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Progress</Text>
      {categoryProgress.length > 0 ? (
        categoryProgress.map((category, index) => (
          <View key={index} style={styles.categoryProgressItem}>
            <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(category.category) }]}>
              <Ionicons name={getCategoryIcon(category.category)} size={24} color="#fff" />
            </View>
            <View style={styles.categoryContent}>
                <Text style={styles.categoryTitle}>
                {category.category.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
                </Text>
              <Text style={styles.categoryStats}>
                {category.totalSessions} {category.totalSessions === 1 ? 'session' : 'sessions'}
                </Text>
              {category.lastSession && (
                <Text style={styles.lastSession}>
                  Last session: {formatDate(category.lastSession)}
                </Text>
              )}
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Complete exercises to track your progress</Text>
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
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={async () => {
            try {
              await ApiService.logout();
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user_id');
              await AsyncStorage.removeItem('user');
              router.replace('/auth/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }}
        >
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {renderQuickStats()}
        {renderCategoryProgress()}
        {renderMoodHistory()}
        {isParent && childrenProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Children's Progress</Text>
            {childrenProgress.map((child, index) => (
              <View key={child.id} style={[
                styles.childProgressContainer,
                index < childrenProgress.length - 1 && styles.childProgressDivider
              ]}>
                {renderChildProgress(child)}
              </View>
            ))}
          </View>
        )}
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
    marginBottom: 12,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
    marginBottom: 12,
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
  categoryProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textTransform: 'capitalize',
  },
  categoryStats: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  lastSession: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  childCategoryProgress: {
    marginTop: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    margin: 16,
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  childProgressContainer: {
    marginBottom: 16,
  },
  childProgressDivider: {
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
}); 
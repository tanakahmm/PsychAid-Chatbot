import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllStats, getCategoryStats, Achievement } from '../../utils/achievements';
import { Ionicons } from '@expo/vector-icons';
import { ApiService, MoodEntry } from '../../services/api';
import { localStorage } from '../../utils/localStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRouter } from 'expo-router';
//import { progressAPI } from '../../services/api';

interface ProgressStats {
  weeklyMoodAverage: number;
  totalMeditations: number;
  totalMeditationMinutes: number;
  streakDays: number;
  lastWeekMoods: Record<string, number>;
  moodDistribution: Record<string, number>;
}

interface Stats {
  totalSessions: number;
  totalMinutes: number;
  categoriesUsed: number;
  lastSession: string | null;
}

interface CategoryStats {
  totalSessions: number;
  totalMinutes: number;
  lastSession: string | null;
}

type RootStackParamList = {
  Login: undefined;
  Progress: undefined;
  // ... other screens
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Progress'>;

export default function ProgressScreen() {
  const [userType, setUserType] = useState<'parent' | 'student' | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [children, setChildren] = useState<Array<{ id: string, name: string }>>([]);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ProgressStats>({
    weeklyMoodAverage: 0,
    totalMeditations: 0,
    totalMeditationMinutes: 0,
    streakDays: 0,
    lastWeekMoods: {
      'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0
    },
    moodDistribution: {
      'Happy': 0, 'Calm': 0, 'Neutral': 0, 'Sad': 0, 'Anxious': 0, 'Angry': 0
    }
  });

  const [overallStats, setOverallStats] = useState<Stats>({
    totalSessions: 0,
    totalMinutes: 0,
    categoriesUsed: 0,
    lastSession: null
  });
  
  const [categoryStats, setCategoryStats] = useState<Record<string, CategoryStats>>({
    meditation: { totalSessions: 0, totalMinutes: 0, lastSession: null },
    anxiety: { totalSessions: 0, totalMinutes: 0, lastSession: null },
    sleep: { totalSessions: 0, totalMinutes: 0, lastSession: null },
    stress: { totalSessions: 0, totalMinutes: 0, lastSession: null },
    selfcare: { totalSessions: 0, totalMinutes: 0, lastSession: null }
  });
  
  const [loadingAchievements, setLoadingAchievements] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp>();
  const router = useRouter();

  const handleAuthError = async (error: any) => {
    console.error('Auth error:', error);
    
    if (error.status === 401 || 
        error.message.includes('Session expired') || 
        error.message.includes('No authentication token found')) {
      setError('Your session has expired. Please login again.');
      await AsyncStorage.multiRemove(['token', 'user']);
      router.replace('/auth/login');
    } else {
      setError('Failed to load progress data. Please try again.');
    }
  };

  const checkAuthAndLoadProgress = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if we have a token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Verify token is still valid
      try {
        const userResponse = await ApiService.getCurrentUser();
        setUserType(userResponse.user_type);
        
        if (userResponse.user_type === 'parent') {
          const childrenResponse = await ApiService.getLinkedChildren();
          setChildren(childrenResponse);
          if (childrenResponse.length > 0) {
            setSelectedChild(childrenResponse[0].id);
          }
        }
      } catch (error: any) {
        if (error.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        throw error;
      }

      // Load progress data
      await loadAllData();
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndLoadProgress();
  }, []);

  useEffect(() => {
    if (userType) {
      loadAllData();
    }
  }, [userType, selectedChild]);

  const loadAllData = async () => {
    setIsLoading(true);
    setLoadingAchievements(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchMoodHistory(),
        loadAchievementStats()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load some data. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingAchievements(false);
    }
  };

  const fetchMoodHistory = async () => {
    try {
      let entries;
      if (userType === 'parent' && selectedChild) {
        // For parents, fetch the selected child's mood history
        entries = await ApiService.getChildMoodHistory(selectedChild);
      } else {
        // For students or when no child is selected
        entries = await ApiService.getMoodHistory();
      }
      
      if (Array.isArray(entries)) {
        setMoodHistory(entries);
        calculateStats(entries);
      } else {
        console.error('Invalid mood history format:', entries);
        setError('Failed to load mood history data');
      }
    } catch (error) {
      console.error('Error fetching mood history:', error);
      setError('Failed to fetch mood history');
    }
  };

  const loadAchievementStats = async () => {
    try {
      let achievementStats;
      if (userType === 'parent' && selectedChild) {
        // For parents, fetch the selected child's achievement stats
        achievementStats = await ApiService.getChildAchievements(selectedChild);
      } else {
        // For students or when no child is selected
        achievementStats = await getAllStats();
      }

      if (achievementStats) {
        setOverallStats({
          totalSessions: achievementStats?.totalSessions || 0,
          totalMinutes: achievementStats?.totalMinutes || 0,
          categoriesUsed: achievementStats?.categoriesUsed || 0,
          lastSession: achievementStats?.lastSession || null,
        });

        const categories = ['meditation', 'anxiety', 'sleep', 'stress', 'selfcare'];
        const catStats: Record<string, CategoryStats> = {};
        
        for (const category of categories) {
          try {
            let stats;
            if (userType === 'parent' && selectedChild) {
              stats = await ApiService.getChildCategoryStats(selectedChild, category);
            } else {
              stats = await getCategoryStats(category as Achievement['category']);
            }
            
            catStats[category] = {
              totalSessions: stats?.totalSessions || 0,
              totalMinutes: stats?.totalMinutes || 0,
              lastSession: stats?.lastSession || null,
            };
          } catch (error) {
            console.error(`Error loading stats for category ${category}:`, error);
            catStats[category] = { totalSessions: 0, totalMinutes: 0, lastSession: null };
          }
        }
        
        setCategoryStats(catStats);
      }
    } catch (error) {
      console.error('Error loading achievement stats:', error);
      setError('Failed to load achievement stats');
    }
  };

  const calculateStats = (entries: MoodEntry[]) => {
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      setStats({
        weeklyMoodAverage: 0,
        totalMeditations: 0,
        totalMeditationMinutes: 0,
        streakDays: 0,
        lastWeekMoods: {
          'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0
        },
        moodDistribution: {
          'Happy': 0, 'Calm': 0, 'Neutral': 0, 'Sad': 0, 'Anxious': 0, 'Angry': 0
        }
      });
      return;
    }

    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const lastWeekEntries = entries.filter(entry => 
        entry && entry.timestamp && new Date(entry.timestamp) >= oneWeekAgo
      );

      const moodToNumber = (mood: string): number => {
        const moodMap: { [key: string]: number } = {
          'Happy': 5,
          'Calm': 4,
          'Neutral': 3,
          'Sad': 2,
          'Anxious': 2,
          'Angry': 1,
        };
        return moodMap[mood] || 3;
      };

      // Initialize moodDistribution with all possible moods
      const moodDistribution: Record<string, number> = {
        'Happy': 0,
        'Calm': 0,
        'Neutral': 0,
        'Sad': 0,
        'Anxious': 0,
        'Angry': 0
      };

      // Calculate mood distribution safely
      entries.forEach(entry => {
        if (entry?.mood && typeof entry.mood === 'string') {
          moodDistribution[entry.mood] = (moodDistribution[entry.mood] || 0) + 1;
        }
      });

      // Initialize lastWeekMoods with all days
      const lastWeekMoods: Record<string, number> = {
        'Sun': 0,
        'Mon': 0,
        'Tue': 0,
        'Wed': 0,
        'Thu': 0,
        'Fri': 0,
        'Sat': 0
      };

      // Update lastWeekMoods safely
      lastWeekEntries.forEach(entry => {
        if (entry?.timestamp && entry?.mood) {
          try {
            const date = new Date(entry.timestamp);
            const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
            lastWeekMoods[day] = moodToNumber(entry.mood);
          } catch (e) {
            console.error('Error processing mood entry:', e);
          }
        }
      });

      const weeklyMoodAverage = lastWeekEntries.length > 0
        ? lastWeekEntries.reduce((sum, entry) => sum + (entry?.mood ? moodToNumber(entry.mood) : 3), 0) / lastWeekEntries.length
        : 0;

      setStats({
        weeklyMoodAverage,
        totalMeditations: stats.totalMeditations || 0,
        totalMeditationMinutes: stats.totalMeditationMinutes || 0,
        streakDays: calculateStreak(entries),
        lastWeekMoods,
        moodDistribution
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
      setError('Error calculating statistics');
    }
  };

  const calculateStreak = (entries: MoodEntry[]): number => {
    if (!entries || !Array.isArray(entries) || entries.length === 0) return 0;

    try {
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const entriesByDate = new Map<string, boolean>();
      entries.forEach(entry => {
        if (entry?.timestamp) {
          const date = new Date(entry.timestamp);
          date.setHours(0, 0, 0, 0);
          entriesByDate.set(date.toISOString(), true);
        }
      });

      for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        if (entriesByDate.has(date.toISOString())) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'meditation': return 'leaf';
      case 'anxiety': return 'heart';
      case 'sleep': return 'moon';
      case 'stress': return 'water';
      case 'selfcare': return 'happy';
      default: return 'star';
    }
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

  const getMoodColorByValue = (value: number): string => {
    const colors = ['#F44336', '#FF9800', '#FFC107', '#2196F3', '#4CAF50'];
    return colors[Math.floor(value) - 1] || colors[2];
  };

  if (isLoading || loadingAchievements || !userType) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={checkAuthAndLoadProgress}>
          <Ionicons name="refresh" size={24} color="#fff" />
          <Text style={styles.refreshButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (userType === 'parent') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content}>
          {children.length > 0 ? (
            <>
              <View style={styles.childSelector}>
                <Text style={styles.sectionTitle}>Your Children</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {children.map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      style={[
                        styles.childButton,
                        selectedChild === child.id && styles.selectedChildButton
                      ]}
                      onPress={() => setSelectedChild(child.id)}
                    >
                      <Ionicons 
                        name="person-circle-outline" 
                        size={24} 
                        color={selectedChild === child.id ? "#fff" : "#666"}
                        style={styles.childIcon}
                      />
                      <Text style={[
                        styles.childButtonText,
                        selectedChild === child.id && styles.selectedChildButtonText
                      ]}>
                        {child.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {selectedChild && (
                <>
                  {/* Quick Stats Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Overview</Text>
                    <View style={styles.quickStats}>
                      <View style={styles.quickStatItem}>
                        <Ionicons name="happy-outline" size={32} color="#4CAF50" />
                        <Text style={styles.quickStatValue}>
                          {(stats?.weeklyMoodAverage || 0).toFixed(1)}
                        </Text>
                        <Text style={styles.quickStatLabel}>Weekly Mood</Text>
                      </View>
                      <View style={styles.quickStatItem}>
                        <Ionicons name="flame-outline" size={32} color="#FF9800" />
                        <Text style={styles.quickStatValue}>{stats?.streakDays || 0}</Text>
                        <Text style={styles.quickStatLabel}>Day Streak</Text>
                      </View>
                      <View style={styles.quickStatItem}>
                        <Ionicons name="time-outline" size={32} color="#2196F3" />
                        <Text style={styles.quickStatValue}>
                          {Math.round(overallStats.totalMinutes)}
                        </Text>
                        <Text style={styles.quickStatLabel}>Total Minutes</Text>
                      </View>
                    </View>
                  </View>

                  {/* Mood Trends */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Weekly Mood Trends</Text>
                    <View style={styles.moodChart}>
                      {Object.entries(stats?.lastWeekMoods || {}).map(([day, value]) => (
                        <View key={day} style={styles.moodBar}>
                          <View 
                            style={[
                              styles.moodBarFill,
                              { 
                                height: `${((value || 0) / 5) * 100}%`,
                                backgroundColor: getMoodColorByValue(value || 0),
                              }
                            ]}
                          />
                          <Text style={styles.moodBarLabel}>{day}</Text>
                          <Text style={styles.moodBarValue}>{value || 0}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Activity Summary */}
                  <View style={[styles.section, styles.achievementsSection]}>
                    <Text style={styles.sectionTitle}>Activity Summary</Text>
                    <View style={styles.activitySummary}>
                      {Object.entries(categoryStats).map(([category, stats]) => (
                        <View key={category} style={styles.activityCard}>
                          <View style={styles.activityHeader}>
                            <Ionicons 
                              name={getCategoryIcon(category)} 
                              size={24} 
                              color="#4CAF50" 
                            />
                            <Text style={styles.activityTitle}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </Text>
                          </View>
                          <View style={styles.activityStats}>
                            <Text style={styles.activityStatText}>
                              Sessions: {stats.totalSessions}
                            </Text>
                            <Text style={styles.activityStatText}>
                              Minutes: {Math.round(stats.totalMinutes)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Mood Distribution */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Mood Distribution</Text>
                    <View style={styles.moodDistribution}>
                      {Object.entries(stats?.moodDistribution || {}).map(([mood, count]) => (
                        <View key={mood} style={styles.moodDistItem}>
                          <Text style={styles.moodDistLabel}>{mood}</Text>
                          <View style={styles.moodDistBar}>
                            <View 
                              style={[
                                styles.moodDistFill,
                                { 
                                  width: `${(count / Math.max(...Object.values(stats?.moodDistribution || {}))) * 100}%`,
                                  backgroundColor: getMoodColor(mood),
                                }
                              ]}
                            />
                          </View>
                          <Text style={styles.moodDistCount}>{count}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity style={styles.refreshButton} onPress={checkAuthAndLoadProgress}>
                    <Ionicons name="refresh" size={24} color="#fff" />
                    <Text style={styles.refreshButtonText}>Refresh Data</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <View style={styles.noChildrenContainer}>
              <Ionicons name="people-outline" size={64} color="#666" />
              <Text style={styles.noChildrenText}>No Children Linked</Text>
              <Text style={styles.noChildrenSubtext}>
                Add your child's email in settings to view their progress
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Student view (original view)
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Original content for student view */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Tracking</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{(stats?.weeklyMoodAverage || 0).toFixed(1)}</Text>
              <Text style={styles.statLabel}>Average Mood</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.streakDays || 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>
        </View>

        {/* Mood Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Distribution</Text>
          <View style={styles.moodDistribution}>
            {Object.entries(stats?.moodDistribution || {}).map(([mood, count]) => (
              <View key={mood} style={styles.moodDistItem}>
                <View style={styles.moodDistBar}>
                  <View 
                    style={[
                      styles.moodDistFill,
                      { 
                        width: `${(count / Math.max(...Object.values(stats?.moodDistribution || {}))) * 100}%`,
                        backgroundColor: getMoodColor(mood),
                      }
                    ]}
                  />
                </View>
                <Text style={styles.moodDistLabel}>{mood}</Text>
                <Text style={styles.moodDistCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Weekly Mood Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Mood</Text>
          <View style={styles.moodChart}>
            {Object.entries(stats?.lastWeekMoods || {}).map(([day, value]) => (
              <View key={day} style={styles.moodBar}>
                <View 
                  style={[
                    styles.moodBarFill,
                    { 
                      height: `${((value || 0) / 5) * 100}%`,
                      backgroundColor: getMoodColorByValue(value || 0),
                    }
                  ]}
                />
                <Text style={styles.moodBarLabel}>{day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Achievements Section */}
        <View style={[styles.section, styles.achievementsSection]}>
          <Text style={styles.sectionTitle}>Activity Achievements</Text>
          <View style={styles.achievementsGrid}>
            <View style={styles.achievementBox}>
              <Text style={styles.achievementNumber}>{overallStats.totalSessions}</Text>
              <Text style={styles.achievementLabel}>Total Sessions</Text>
            </View>
            <View style={styles.achievementBox}>
              <Text style={styles.achievementNumber}>{Math.round(overallStats.totalMinutes)}</Text>
              <Text style={styles.achievementLabel}>Minutes</Text>
            </View>
            <View style={styles.achievementBox}>
              <Text style={styles.achievementNumber}>{overallStats.categoriesUsed}</Text>
              <Text style={styles.achievementLabel}>Categories</Text>
            </View>
          </View>
        </View>

        {/* Category Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Progress</Text>
          {Object.entries(categoryStats || {}).map(([category, stats]) => (
            <View key={category} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Ionicons name={getCategoryIcon(category)} size={24} color="#4CAF50" />
                <Text style={styles.categoryTitle}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </View>
              <View style={styles.categoryStats}>
                <Text style={styles.categoryStatText}>
                  Sessions: {stats.totalSessions}
                </Text>
                <Text style={styles.categoryStatText}>
                  Minutes: {Math.round(stats.totalMinutes)}
                </Text>
                <Text style={styles.categoryStatText}>
                  Last: {stats.lastSession ? formatDate(stats.lastSession) : 'Never'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={checkAuthAndLoadProgress}>
          <Ionicons name="refresh" size={24} color="#fff" />
          <Text style={styles.refreshButtonText}>Refresh Stats</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  moodChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: 20,
  },
  moodBar: {
    width: 30,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  moodBarFill: {
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  moodBarLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  moodDistribution: {
    marginTop: 16,
  },
  moodDistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moodDistBar: {
    flex: 1,
    height: 20,
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  moodDistFill: {
    height: '100%',
    borderRadius: 10,
  },
  moodDistLabel: {
    width: 80,
    marginLeft: 12,
    fontSize: 14,
  },
  moodDistCount: {
    width: 40,
    textAlign: 'right',
    fontSize: 14,
    color: '#666',
  },
  achievementsSection: {
    marginTop: 16,
  },
  achievementsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  achievementBox: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    minWidth: 100,
  },
  achievementNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  achievementLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  categoryCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  categoryStats: {
    marginLeft: 36,
  },
  categoryStatText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#FF0000',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  childSelector: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  childButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
    marginVertical: 8,
  },
  selectedChildButton: {
    backgroundColor: '#4CAF50',
  },
  childButtonText: {
    fontSize: 16,
    color: '#666',
  },
  selectedChildButtonText: {
    color: '#fff',
  },
  noChildrenContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noChildrenText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  noChildrenSubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  quickStatItem: {
    alignItems: 'center',
    flex: 1,
    padding: 10,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  childIcon: {
    marginRight: 8,
  },
  activitySummary: {
    marginTop: 10,
  },
  activityCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    color: '#333',
  },
  activityStats: {
    marginLeft: 36,
  },
  activityStatText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  moodBarValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
}); 
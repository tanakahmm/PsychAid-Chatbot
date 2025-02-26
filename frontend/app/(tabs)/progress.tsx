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

interface ProgressStats {
  weeklyMoodAverage: number;
  totalMeditations: number;
  totalMeditationMinutes: number;
  streakDays: number;
  lastWeekMoods: { [key: string]: number };
  moodDistribution: { [key: string]: number };
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

export default function ProgressScreen() {
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ProgressStats>({
    weeklyMoodAverage: 0,
    totalMeditations: 0,
    totalMeditationMinutes: 0,
    streakDays: 0,
    lastWeekMoods: {},
    moodDistribution: {},
  });

  // New states for achievements
  const [overallStats, setOverallStats] = useState<Stats | null>(null);
  const [categoryStats, setCategoryStats] = useState<Record<string, CategoryStats>>({});
  const [loadingAchievements, setLoadingAchievements] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setLoadingAchievements(true);
    await Promise.all([
      fetchMoodHistory(),
      loadAchievementStats()
    ]);
    setIsLoading(false);
    setLoadingAchievements(false);
  };

  const calculateStats = (entries: MoodEntry[]) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const lastWeekEntries = entries.filter(entry => 
      new Date(entry.timestamp) >= oneWeekAgo
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

    // Calculate mood distribution
    const moodDistribution = entries.reduce((acc: { [key: string]: number }, entry) => {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1;
      return acc;
    }, {});

    // Calculate mood streak
    const moodStreak = calculateStreak(entries);

    // Calculate weekly mood average
    const weeklyMoodAverage = lastWeekEntries.length > 0
      ? lastWeekEntries.reduce((sum, entry) => sum + moodToNumber(entry.mood), 0) / lastWeekEntries.length
      : 0;

    // Count moods by day
    const lastWeekMoods: { [key: string]: number } = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
      lastWeekMoods[day] = 0;
    });

    lastWeekEntries.forEach(entry => {
      const day = days[new Date(entry.timestamp).getDay()];
      lastWeekMoods[day] = moodToNumber(entry.mood);
    });

    setStats({
      weeklyMoodAverage,
      totalMeditations: stats.totalMeditations,
      totalMeditationMinutes: stats.totalMeditationMinutes,
      streakDays: moodStreak,
      lastWeekMoods,
      moodDistribution,
    });
  };

  const calculateStreak = (entries: MoodEntry[]): number => {
    if (entries.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const entriesByDate = new Map<string, boolean>();
    entries.forEach(entry => {
      const date = new Date(entry.timestamp);
      date.setHours(0, 0, 0, 0);
      entriesByDate.set(date.toISOString(), true);
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
  };

  const fetchMoodHistory = async () => {
    try {
      const entries = await ApiService.getMoodHistory();
      setMoodHistory(entries);
      calculateStats(entries);
    } catch (error) {
      console.error('Error fetching mood history:', error);
    }
  };

  const loadAchievementStats = async () => {
    try {
      const stats = await getAllStats();
      setOverallStats(stats);

      const categories = ['meditation', 'anxiety', 'sleep', 'stress', 'selfcare'];
      const catStats: Record<string, CategoryStats> = {};
      
      for (const category of categories) {
        catStats[category] = await getCategoryStats(category as Achievement['category']);
      }
      
      setCategoryStats(catStats);
    } catch (error) {
      console.error('Error loading achievement stats:', error);
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

  if (isLoading || loadingAchievements) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Mood Tracking Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Tracking</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.weeklyMoodAverage.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Average Mood</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.streakDays}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>
        </View>

        {/* Mood Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Distribution</Text>
          <View style={styles.moodDistribution}>
            {Object.entries(stats.moodDistribution).map(([mood, count]) => (
              <View key={mood} style={styles.moodDistItem}>
                <View style={styles.moodDistBar}>
                  <View 
                    style={[
                      styles.moodDistFill,
                      { 
                        width: `${(count / Math.max(...Object.values(stats.moodDistribution))) * 100}%`,
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
            {Object.entries(stats.lastWeekMoods).map(([day, value]) => (
              <View key={day} style={styles.moodBar}>
                <View 
                  style={[
                    styles.moodBarFill,
                    { 
                      height: `${(value / 5) * 100}%`,
                      backgroundColor: getMoodColorByValue(value),
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
              <Text style={styles.achievementNumber}>{overallStats?.totalSessions || 0}</Text>
              <Text style={styles.achievementLabel}>Total Sessions</Text>
            </View>
            <View style={styles.achievementBox}>
              <Text style={styles.achievementNumber}>{Math.round(overallStats?.totalMinutes || 0)}</Text>
              <Text style={styles.achievementLabel}>Minutes</Text>
            </View>
            <View style={styles.achievementBox}>
              <Text style={styles.achievementNumber}>{overallStats?.categoriesUsed || 0}</Text>
              <Text style={styles.achievementLabel}>Categories</Text>
            </View>
          </View>
        </View>

        {/* Category Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Progress</Text>
          {Object.entries(categoryStats).map(([category, stats]) => (
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

        <TouchableOpacity style={styles.refreshButton} onPress={loadAllData}>
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
}); 
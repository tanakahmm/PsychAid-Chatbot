import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiService, MoodEntry } from '../../services/api';

interface ProgressStats {
  weeklyMoodAverage: number;
  totalMeditations: number;
  totalMeditationMinutes: number;
  streakDays: number;
  lastWeekMoods: { [key: string]: number };
  moodDistribution: { [key: string]: number };
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  achieved: boolean;
  progress: number;
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
    achievements: [],
  });

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

    // Calculate mood streak for achievement
    const moodStreak = calculateStreak(entries);
    
    // Calculate achievements
    const achievements: Achievement[] = [
      {
        id: '1',
        title: 'Mood Tracker',
        description: 'Track your mood for 7 days in a row',
        icon: 'calendar',
        achieved: moodStreak >= 7,
        progress: Math.min(moodStreak / 7, 1) * 100,
      },
      {
        id: '2',
        title: 'Meditation Master',
        description: 'Complete 10 meditation sessions',
        icon: 'leaf',
        achieved: stats.totalMeditations >= 10,
        progress: Math.min(stats.totalMeditations / 10, 1) * 100,
      },
      {
        id: '3',
        title: 'Mindfulness Journey',
        description: 'Meditate for a total of 60 minutes',
        icon: 'timer',
        achieved: stats.totalMeditationMinutes >= 60,
        progress: Math.min(stats.totalMeditationMinutes / 60, 1) * 100,
      },
    ];

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
      achievements,
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMoodHistory();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Your Progress</Text>
      
      <ScrollView style={styles.content}>
        {/* Weekly Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Summary</Text>
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

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsContainer}>
            {stats.achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementCard}>
                <View style={[styles.achievementIcon, achievement.achieved && styles.achievementIconCompleted]}>
                  <Ionicons name={achievement.icon as any} size={24} color={achievement.achieved ? '#fff' : '#007AFF'} />
                </View>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${achievement.progress}%` }]} />
                  </View>
                </View>
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
      </ScrollView>
    </SafeAreaView>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
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
  achievementsContainer: {
    marginTop: 8,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementIconCompleted: {
    backgroundColor: '#007AFF',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
}); 
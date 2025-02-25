import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiService, MoodEntry } from '../../services/api';

interface ProgressStats {
  weeklyMoodAverage: number;
  totalMeditations: number;
  totalMeditationMinutes: number;
  streakDays: number;
  lastWeekMoods: { [key: string]: number };
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
      totalMeditations: 0, // TODO: Implement meditation tracking
      totalMeditationMinutes: 0,
      streakDays: calculateStreak(entries),
      lastWeekMoods,
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

        {/* Meditation Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meditation Progress</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalMeditations}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalMeditationMinutes}</Text>
              <Text style={styles.statLabel}>Total Minutes</Text>
            </View>
          </View>
        </View>

        {/* Weekly Mood */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Mood</Text>
          <View style={styles.moodChart}>
            {Object.entries(stats.lastWeekMoods).map(([day, value]) => (
              <View key={day} style={styles.moodBar}>
                <View 
                  style={[
                    styles.moodBarFill,
                    { height: `${(value / 5) * 100}%` }
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
}); 
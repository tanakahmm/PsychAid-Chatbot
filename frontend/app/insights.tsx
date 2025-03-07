import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/api';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

interface MoodInsight {
  total_entries: number;
  mood_distribution: { [key: string]: number };
  most_common_mood: string;
  mood_trend: Array<{
    date: string;
    mood: string;
  }>;
  last_updated: string;
}

interface Recommendation {
  type: string;
  title: string;
  description: string;
  duration: number;
}

interface RecommendationsResponse {
  current_mood: string;
  recommendations: Recommendation[];
  timestamp: string;
}

export default function InsightsScreen() {
  const [insights, setInsights] = useState<MoodInsight | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [insightsResponse, recommendationsResponse] = await Promise.all([
        ApiService.getMoodInsights(),
        ApiService.getRecommendations()
      ]);

      if (insightsResponse) {
        setInsights(insightsResponse);
      }
      
      if (recommendationsResponse) {
        setRecommendations(recommendationsResponse);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodColor = (mood: string) => {
    const colors: { [key: string]: string } = {
      happy: '#2ecc71',
      sad: '#3498db',
      anxious: '#e74c3c',
      angry: '#f1c40f',
      neutral: '#95a5a6'
    };
    return colors[mood.toLowerCase()] || '#95a5a6';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (!insights || !recommendations) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No data available</Text>
      </View>
    );
  }

  const chartData = {
    labels: insights.mood_trend.slice(-7).map(entry => 
      new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [{
      data: insights.mood_trend.slice(-7).map(entry => 
        Object.keys(insights.mood_distribution).indexOf(entry.mood) + 1
      )
    }]
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mood Overview</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{insights.total_entries}</Text>
            <Text style={styles.statLabel}>Total Entries</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{insights.most_common_mood}</Text>
            <Text style={styles.statLabel}>Most Common Mood</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mood Distribution</Text>
        <View style={styles.moodDistribution}>
          {Object.entries(insights.mood_distribution).map(([mood, count]) => (
            <View key={mood} style={styles.moodItem}>
              <View style={[styles.moodColor, { backgroundColor: getMoodColor(mood) }]} />
              <Text style={styles.moodName}>{mood}</Text>
              <Text style={styles.moodCount}>{count}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mood Trend</Text>
        <LineChart
          data={chartData}
          width={Dimensions.get('window').width - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
            style: {
              borderRadius: 16
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personalized Recommendations</Text>
        <Text style={styles.currentMood}>
          Based on your current mood: {recommendations.current_mood}
        </Text>
        {recommendations.recommendations.map((rec, index) => (
          <TouchableOpacity key={index} style={styles.recommendationCard}>
            <View style={styles.recommendationHeader}>
              <Ionicons
                name={rec.type === 'activity' ? 'book-outline' : 'fitness-outline'}
                size={24}
                color="#3498db"
              />
              <Text style={styles.recommendationTitle}>{rec.title}</Text>
            </View>
            <Text style={styles.recommendationDescription}>{rec.description}</Text>
            <Text style={styles.recommendationDuration}>{rec.duration} minutes</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  statsContainer: {
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
    color: '#3498db',
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  moodDistribution: {
    marginTop: 8,
  },
  moodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moodColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  moodName: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  moodCount: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  currentMood: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  recommendationCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 20,
  },
  recommendationDuration: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
}); 
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

export default function ParentDashboard() {
  const moodData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: [3, 4, 2, 5, 3, 4, 4], // 1-5 scale for mood
    }],
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Child's Progress Dashboard</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Mood Trends</Text>
        <LineChart
          data={moodData}
          width={Dimensions.get('window').width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Activity</Text>
        <View style={styles.activityItem}>
          <Text style={styles.activityTitle}>Last Session</Text>
          <Text style={styles.activityValue}>Today, 2:30 PM</Text>
        </View>
        <View style={styles.activityItem}>
          <Text style={styles.activityTitle}>Mood</Text>
          <Text style={styles.activityValue}>Positive ↑</Text>
        </View>
        <View style={styles.activityItem}>
          <Text style={styles.activityTitle}>Session Duration</Text>
          <Text style={styles.activityValue}>25 minutes</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recommendations</Text>
        <Text style={styles.recommendationText}>
          Based on recent interactions, consider:
          {'\n'}- Discussing school activities
          {'\n'}- Encouraging outdoor activities
          {'\n'}- Maintaining regular check-ins
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityTitle: {
    color: '#666',
  },
  activityValue: {
    fontWeight: '500',
    color: '#333',
  },
  recommendationText: {
    lineHeight: 24,
    color: '#666',
  },
}); 
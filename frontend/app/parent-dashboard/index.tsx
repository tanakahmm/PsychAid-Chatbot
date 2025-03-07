import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Text as SvgText } from 'react-native-svg';

export default function ParentDashboard() {
  const moodData = [3, 4, 2, 5, 3, 4, 4];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const width = Dimensions.get('window').width - 40;
  const height = 200;
  const padding = 40;
  const graphWidth = width - 2 * padding;
  const graphHeight = height - 2 * padding;
  
  // Calculate points for the line
  const points = moodData.map((value, index) => ({
    x: padding + (index * (graphWidth / (moodData.length - 1))),
    y: padding + graphHeight - (value - 1) * (graphHeight / 4)
  }));

  // Create the path string
  const pathString = points.reduce((acc, point, index) => {
    return acc + `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y} `;
  }, '');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parent Dashboard</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Child's Mood Progress</Text>
        <View style={styles.chartContainer}>
          <Svg width={width} height={height}>
            {/* Y-axis labels */}
            {[1, 2, 3, 4, 5].map((value, index) => (
              <SvgText
                key={`y-${index}`}
                x={padding - 20}
                y={padding + graphHeight - (index * (graphHeight / 4))}
                fontSize="12"
                fill="#666"
              >
                {value}
              </SvgText>
            ))}

            {/* X-axis labels */}
            {days.map((day, index) => (
              <SvgText
                key={`x-${index}`}
                x={padding + (index * (graphWidth / (days.length - 1)))}
                y={height - padding + 20}
                fontSize="12"
                fill="#666"
                textAnchor="middle"
              >
                {day}
              </SvgText>
            ))}

            {/* Grid lines */}
            {[1, 2, 3, 4, 5].map((_, index) => (
              <Line
                key={`grid-${index}`}
                x1={padding}
                y1={padding + (index * (graphHeight / 4))}
                x2={width - padding}
                y2={padding + (index * (graphHeight / 4))}
                stroke="#eee"
                strokeWidth="1"
              />
            ))}

            {/* Data line */}
            <Path
              d={pathString}
              stroke="#007AFF"
              strokeWidth="2"
              fill="none"
            />
          </Svg>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityItem}>
          <Text style={styles.activityTitle}>Last Session</Text>
          <Text style={styles.activityDetail}>Today, 2:30 PM - 20 minutes</Text>
        </View>
        <View style={styles.activityItem}>
          <Text style={styles.activityTitle}>Mood Trend</Text>
          <Text style={styles.activityDetail}>Slightly improving over the past week</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommendations</Text>
        <View style={styles.recommendationItem}>
          <Text style={styles.recommendationTitle}>Schedule Check-in</Text>
          <Text style={styles.recommendationDetail}>
            Consider having a casual conversation about their day
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  activityItem: {
    marginBottom: 15,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  activityDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  recommendationItem: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  recommendationDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
}); 
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiService, Resource } from '../../../services/api';

export default function ResourceDetailScreen() {
  const { id } = useLocalSearchParams();
  const [resource, setResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const data = await ApiService.getResourceById(id as string);
        setResource(data);
      } catch (err) {
        setError('Failed to load resource. Please try again later.');
        console.error('Error fetching resource:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResource();
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading resource...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !resource) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{error || 'Resource not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{resource.title}</Text>
          {resource.duration && (
            <View style={styles.durationContainer}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.duration}>{resource.duration} min</Text>
            </View>
          )}
          <Text style={styles.type}>{resource.type}</Text>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>{resource.description}</Text>
        </View>

        {resource.content && (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Content</Text>
            <Text style={styles.content}>{resource.content}</Text>
          </View>
        )}
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
  loadingText: {
    marginTop: 12,
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
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  duration: {
    marginLeft: 4,
    fontSize: 16,
    color: '#666',
  },
  type: {
    fontSize: 16,
    color: '#007AFF',
    textTransform: 'capitalize',
  },
  descriptionContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  contentContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
});

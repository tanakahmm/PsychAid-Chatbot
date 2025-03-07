import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { progressAPI, authAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

interface ProgressData {
  total_sessions: number;
  total_minutes: number;
  latest_session: {
    type: string;
    duration: number;
    timestamp: string;
  } | null;
}

const ProgressScreen: React.FC = () => {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkAuthAndLoadProgress();
    });

    return unsubscribe;
  }, [navigation]);

  const checkAuthAndLoadProgress = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we have a token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Verify token is still valid
      try {
        await authAPI.getCurrentUser();
      } catch (error: any) {
        if (error.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        throw error;
      }

      // Load progress data
      const data = await progressAPI.getProgress();
      setProgressData(data);
    } catch (error: any) {
      console.error('Progress loading error:', error);
      handleAuthError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAuthError = async (error: any) => {
    console.error('Auth error:', error);
    
    if (error.status === 401 || error.message.includes('Session expired') || error.message.includes('No authentication token found')) {
      setError('Your session has expired. Please login again.');
      await AsyncStorage.multiRemove(['token', 'user']);
      navigation.navigate('Login');
    } else {
      setError('Failed to load progress data. Please try again.');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    checkAuthAndLoadProgress();
  }, []);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      navigation.navigate('Login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <MaterialIcons name="error-outline" size={48} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={checkAuthAndLoadProgress}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.error, marginTop: 10 }]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.title, { color: theme.text }]}>Your Progress</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialIcons name="timer" size={24} color={theme.primary} />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {progressData?.total_minutes || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>Minutes</Text>
          </View>

          <View style={styles.statItem}>
            <MaterialIcons name="psychology" size={24} color={theme.primary} />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {progressData?.total_sessions || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>Sessions</Text>
          </View>
        </View>

        {progressData?.latest_session && (
          <View style={styles.latestSession}>
            <Text style={[styles.subtitle, { color: theme.text }]}>Latest Session</Text>
            <Text style={[styles.sessionText, { color: theme.text }]}>
              Type: {progressData.latest_session.type}
            </Text>
            <Text style={[styles.sessionText, { color: theme.text }]}>
              Duration: {progressData.latest_session.duration} minutes
            </Text>
            <Text style={[styles.sessionText, { color: theme.text }]}>
              Date: {new Date(progressData.latest_session.timestamp).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  latestSession: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  sessionText: {
    fontSize: 16,
    marginVertical: 4,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProgressScreen; 
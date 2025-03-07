import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LandingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="heart" size={64} color="#3498db" />
          <Text style={styles.title}>Welcome to PsychAid</Text>
          <Text style={styles.subtitle}>Your mental health companion</Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="chatbubbles-outline" size={32} color="#3498db" />
            <Text style={styles.featureTitle}>24/7 Support</Text>
            <Text style={styles.featureText}>
              Get immediate help and support whenever you need it
            </Text>
          </View>

          <View style={styles.feature}>
            <Ionicons name="shield-checkmark-outline" size={32} color="#3498db" />
            <Text style={styles.featureTitle}>Safe Space</Text>
            <Text style={styles.featureText}>
              Share your thoughts in a confidential environment
            </Text>
          </View>

          <View style={styles.feature}>
            <Ionicons name="analytics-outline" size={32} color="#3498db" />
            <Text style={styles.featureTitle}>Track Progress</Text>
            <Text style={styles.featureText}>
              Monitor your mental health journey
            </Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push('/public-chat')}
          >
            <Text style={styles.primaryButtonText}>Try Public Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.secondaryButtonText}>Login for More Features</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center',
  },
  features: {
    marginTop: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 16,
    flex: 1,
  },
  featureText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 16,
    flex: 1,
  },
  buttons: {
    marginBottom: 40,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#3498db',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
}); 
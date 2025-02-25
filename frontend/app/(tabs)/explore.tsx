import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiService, Resource } from '../../services/api';

interface Category {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
}

interface DailyTip {
  id: string;
  tip: string;
  date: string;
}

export default function ExploreScreen() {
  const router = useRouter();
  const [featuredContent, setFeaturedContent] = useState<Resource[]>([]);
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // For now, we'll use the resources endpoint and filter/transform the data
        const resources = await ApiService.getResources();
        
        // Get featured content (first 3 resources)
        setFeaturedContent(resources.slice(0, 3));
        
        // Create categories with counts
        const categoryMap = resources.reduce((acc: { [key: string]: number }, resource) => {
          acc[resource.type] = (acc[resource.type] || 0) + 1;
          return acc;
        }, {});
        
        setCategories([
          {
            id: 'meditation',
            title: 'Meditation',
            icon: 'leaf-outline',
            count: categoryMap['meditation'] || 0,
          },
          {
            id: 'breathing',
            title: 'Breathing',
            icon: 'fitness-outline',
            count: categoryMap['breathing'] || 0,
          },
          {
            id: 'articles',
            title: 'Articles',
            icon: 'book-outline',
            count: categoryMap['articles'] || 0,
          },
        ]);
        
        // Set a mock daily tip (in production, this would come from the backend)
        setDailyTip({
          id: '1',
          tip: 'Take a moment to breathe deeply and ground yourself. Remember that you are capable and strong.',
          date: new Date().toLocaleDateString(),
        });
      } catch (err) {
        setError('Failed to load explore content. Please try again later.');
        console.error('Error fetching explore content:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Explore</Text>
      
      <ScrollView style={styles.content}>
        {/* Featured Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Content</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredContent}
          >
            {featuredContent.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.featuredCard}
                onPress={() => router.push(`/resource/${item.id}`)}
              >
                <View style={styles.featuredImageContainer}>
                  <Ionicons 
                    name={item.type === 'meditation' ? 'leaf-outline' : 'book-outline'} 
                    size={32} 
                    color="#007AFF" 
                  />
                </View>
                <View style={styles.featuredInfo}>
                  <Text style={styles.featuredTitle}>{item.title}</Text>
                  <Text style={styles.featuredDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Daily Tip */}
        {dailyTip && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Tip</Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipText}>{dailyTip.tip}</Text>
              <Text style={styles.tipDate}>{dailyTip.date}</Text>
            </View>
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => router.push('/resource')}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons name={category.icon} size={24} color="#007AFF" />
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryCount}>{category.count} items</Text>
              </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  featuredContent: {
    paddingHorizontal: 16,
  },
  featuredCard: {
    width: 280,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
  },
  featuredImageContainer: {
    height: 140,
    backgroundColor: '#E3F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredInfo: {
    padding: 16,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tipCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
  },
  tipText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 8,
  },
  tipDate: {
    fontSize: 14,
    color: '#666',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 14,
    color: '#666',
  },
}); 
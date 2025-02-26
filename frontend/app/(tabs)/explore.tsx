import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  TextInput,
  Animated,
  Modal,
  Dimensions,
  Platform,
  FlatList,
  Vibration,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ApiService, Resource } from '../../services/api';
import { MeditationTimer } from '../../components/MeditationTimer';

interface Category {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  description: string;
}

interface DailyTip {
  id: string;
  tip: string;
  date: string;
}

interface TimerModalProps {
  visible: boolean;
  onClose: () => void;
  duration: number;
  type: string;
}

const HAPTIC_OPTIONS = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
};

const TimerModal: React.FC<TimerModalProps> = ({ visible, onClose, duration, type }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);

      Animated.timing(progressAnim, {
        toValue: (duration - timeLeft) / duration,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const resetTimer = () => {
    setTimeLeft(duration);
    setIsActive(false);
    progressAnim.setValue(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={['#F0F7FF', '#E3F2FF']}
          style={styles.modalContent}
        >
          <Text style={styles.modalTitle}>{type} Timer</Text>
          <View style={styles.progressContainer}>
            <Animated.View 
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]} 
            />
          </View>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          <View style={styles.timerControls}>
            <TouchableOpacity 
              style={[styles.timerButton, isActive && styles.timerButtonActive]} 
              onPress={() => setIsActive(!isActive)}
            >
              <Ionicons 
                name={isActive ? 'pause' : 'play'} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.timerButton} 
              onPress={resetTimer}
            >
              <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
};

export default function ExploreScreen() {
  const router = useRouter();
  const [featuredContent, setFeaturedContent] = useState<Resource[]>([]);
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Resource[]>([]);
  const [likedContent, setLikedContent] = useState<Set<string>>(new Set());
  const [showTimer, setShowTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(0);
  const [selectedType, setSelectedType] = useState('');
  const [showMindfulnessTimer, setShowMindfulnessTimer] = useState(false);
  const [mindfulnessCompleted, setMindfulnessCompleted] = useState(false);
  const fadeAnim = new Animated.Value(0);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'duration'>('recent');
  const [showFeatured, setShowFeatured] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulated content for different categories
        const mockResources: Resource[] = [
          {
            id: 'med-1',
            title: 'Mindful Breathing Meditation',
            description: 'A guided meditation focusing on breath awareness for stress relief',
            type: 'meditation',
            duration: 600,
          },
          {
            id: 'med-2',
            title: 'Body Scan Meditation',
            description: 'Progressive relaxation meditation for better sleep and reduced anxiety',
            type: 'meditation',
            duration: 900,
          },
          {
            id: 'breath-1',
            title: '4-7-8 Breathing Technique',
            description: 'A calming breathing exercise to reduce anxiety and improve focus',
            type: 'breathing',
            duration: 300,
          },
          {
            id: 'breath-2',
            title: 'Box Breathing Practice',
            description: 'Navy SEAL technique for stress management and mental clarity',
            type: 'breathing',
            duration: 300,
          },
          {
            id: 'art-1',
            title: 'Understanding Anxiety',
            description: 'Learn about the science behind anxiety and effective coping strategies',
            type: 'articles',
            content: 'Comprehensive guide to anxiety management',
          },
          {
            id: 'art-2',
            title: 'The Power of Positive Thinking',
            description: 'How positive thoughts can reshape your mental well-being',
            type: 'articles',
            content: 'Research-backed benefits of positive psychology',
          },
          {
            id: 'art-3',
            title: 'Sleep and Mental Health',
            description: 'The crucial connection between quality sleep and emotional well-being',
            type: 'articles',
            content: 'Sleep hygiene tips and research',
          },
          {
            id: 'ex-1',
            title: 'Morning Energy Boost',
            description: '10-minute energizing exercise routine to start your day',
            type: 'exercises',
            duration: 600,
          },
          {
            id: 'ex-2',
            title: 'Stress Relief Stretches',
            description: 'Gentle stretching exercises to release physical tension',
            type: 'exercises',
            duration: 300,
          },
          {
            id: 'ex-3',
            title: 'Mood-Lifting Yoga Flow',
            description: 'Simple yoga sequence to boost mood and energy',
            type: 'exercises',
            duration: 900,
          },
          {
            id: 'jour-1',
            title: 'Gratitude Journal',
            description: 'Daily prompts to cultivate gratitude and positive mindset',
            type: 'journal',
            content: 'Interactive gratitude exercises',
          },
          {
            id: 'jour-2',
            title: 'Emotion Tracking',
            description: 'Track and understand your emotional patterns',
            type: 'journal',
            content: 'Guided emotion logging prompts',
          },
          {
            id: 'jour-3',
            title: 'Self-Discovery Prompts',
            description: 'Thought-provoking questions for self-reflection',
            type: 'journal',
            content: 'Deep reflection exercises',
          },
        ];

        // Set featured content (one from each category)
        setFeaturedContent([
          mockResources.find(r => r.type === 'meditation'),
          mockResources.find(r => r.type === 'breathing'),
          mockResources.find(r => r.type === 'articles'),
        ].filter(Boolean) as Resource[]);
        
        // Calculate category counts
        const categoryMap = mockResources.reduce((acc: { [key: string]: number }, resource: Resource) => {
          acc[resource.type] = (acc[resource.type] || 0) + 1;
          return acc;
        }, {});
        
        setCategories([
          {
            id: 'meditation',
            title: 'Meditation',
            icon: 'leaf-outline',
            count: categoryMap['meditation'] || 0,
            description: 'Find peace and clarity through guided meditation sessions',
          },
          {
            id: 'breathing',
            title: 'Breathing',
            icon: 'fitness-outline',
            count: categoryMap['breathing'] || 0,
            description: 'Learn breathing techniques to reduce stress and anxiety',
          },
          {
            id: 'articles',
            title: 'Articles',
            icon: 'book-outline',
            count: categoryMap['articles'] || 0,
            description: 'Read expert insights on mental health and well-being',
          },
          {
            id: 'exercises',
            title: 'Exercises',
            icon: 'body-outline',
            count: categoryMap['exercises'] || 0,
            description: 'Physical exercises to boost your mood and energy',
          },
          {
            id: 'journal',
            title: 'Journal',
            icon: 'journal-outline',
            count: categoryMap['journal'] || 0,
            description: 'Guided journaling prompts for self-reflection',
          },
        ]);

        // Set recommendations based on type and excluding articles
        const recommendedContent = mockResources
          .filter(resource => resource.type !== 'articles')
          .sort(() => Math.random() - 0.5)
          .slice(0, 4);
        setRecommendations(recommendedContent);
        
        // Set daily tip
        const tips = [
          'Take a moment to breathe deeply and ground yourself. Remember that you are capable and strong.',
          'Practice self-compassion today. Treat yourself with the same kindness you show others.',
          'Small steps lead to big changes. Celebrate your progress, no matter how small.',
          'Your feelings are valid. It\'s okay to take time to process and heal.',
        ];
        
        setDailyTip({
          id: new Date().toISOString(),
          tip: tips[Math.floor(Math.random() * tips.length)],
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

  const sortContent = (content: Resource[]) => {
    switch (sortBy) {
      case 'recent':
        return [...content].sort((a, b) => b.id.localeCompare(a.id));
      case 'popular':
        return [...content].sort((a, b) => (likedContent.has(b.id) ? 1 : -1) - (likedContent.has(a.id) ? 1 : -1));
      case 'duration':
        return [...content].sort((a, b) => (b.duration || 0) - (a.duration || 0));
      default:
        return content;
    }
  };

  const filteredContent = sortContent([...featuredContent, ...recommendations].filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.type === selectedCategory;
    return matchesSearch && matchesCategory;
  }));

  const handleCategoryPress = async (category: Category) => {
    await HAPTIC_OPTIONS.medium();
    setSelectedCategory(selectedCategory === category.id ? null : category.id);
    
    if (category.id === 'meditation') {
      setTimerDuration(600);
      setSelectedType('Meditation');
      setShowTimer(true);
    } else if (category.id === 'breathing') {
      setTimerDuration(300);
      setSelectedType('Breathing');
      setShowTimer(true);
    } else if (category.id === 'exercises') {
      setTimerDuration(900);
      setSelectedType('Exercise');
      setShowTimer(true);
    }
  };

  const handleLikeContent = async (contentId: string) => {
    await HAPTIC_OPTIONS.light();
    setLikedContent(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contentId)) {
        newSet.delete(contentId);
      } else {
        newSet.add(contentId);
      }
      return newSet;
    });
  };

  const getIconForType = (type: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      'meditation': 'leaf-outline',
      'breathing': 'fitness-outline',
      'articles': 'book-outline',
      'exercises': 'body-outline',
      'journal': 'journal-outline'
    };
    return iconMap[type] || 'document-outline';
  };

  const handleTimerComplete = async () => {
    try {
      if (selectedType === 'Meditation') {
        await ApiService.updateMeditationProgress(timerDuration / 60);
      }
      Alert.alert('Success', `${selectedType} session completed!`);
      setShowTimer(false);
    } catch (error) {
      console.error('Error updating progress:', error);
      Alert.alert('Error', 'Failed to update progress');
    }
  };

  const handleMindfulnessComplete = async () => {
    try {
      await ApiService.updateMindfulnessProgress(60);
      setMindfulnessCompleted(true);
      Alert.alert('Congratulations!', 'You have completed your mindfulness journey for today!');
      setShowMindfulnessTimer(false);
    } catch (error) {
      console.error('Error updating mindfulness progress:', error);
      Alert.alert('Error', 'Failed to update mindfulness progress');
    }
  };

  const renderFeaturedSection = () => {
    if (!showFeatured) return null;
    
    return (
      <Animated.View 
        style={[
          styles.featuredSection,
          {
            transform: [{
              translateY: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [0, -50],
                extrapolate: 'clamp',
              }),
            }],
          },
        ]}
      >
        <LinearGradient
          colors={['#007AFF', '#00C6FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.featuredGradient}
        >
          <Text style={styles.featuredTitle}>Featured</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={featuredContent}
            keyExtractor={(item) => `featured-${item.id}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.featuredCard}
                onPress={() => {
                  if (item.type === 'meditation' || item.type === 'breathing' || item.type === 'exercises') {
                    setTimerDuration(item.duration || 300);
                    setSelectedType(item.type.charAt(0).toUpperCase() + item.type.slice(1));
                    setShowTimer(true);
                  }
                }}
              >
                <View style={styles.featuredIconContainer}>
                  <Ionicons 
                    name={getIconForType(item.type)} 
                    size={32} 
                    color="#fff" 
                  />
                </View>
                <Text style={styles.featuredCardTitle}>{item.title}</Text>
                <Text style={styles.featuredCardDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            )}
          />
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderContentItem = ({ item }: { item: Resource }) => (
    <Animated.View 
      style={[
        styles.contentCard,
        {
          transform: [
            {
              scale: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={async () => {
          await HAPTIC_OPTIONS.light();
          if (item.type === 'meditation' || item.type === 'breathing' || item.type === 'exercises') {
            setTimerDuration(item.duration || 300);
            setSelectedType(item.type.charAt(0).toUpperCase() + item.type.slice(1));
            setShowTimer(true);
          } else if (item.type === 'mindfulness') {
            setShowMindfulnessTimer(true);
          } else if (item.type === 'articles') {
            // Show article content in a modal
          } else if (item.type === 'journal') {
            router.push('/mood');
          }
        }}
      >
        <LinearGradient
          colors={['#F8F8F8', '#F0F0F0']}
          style={styles.contentGradient}
        >
          <View style={styles.contentImageContainer}>
            <Ionicons 
              name={getIconForType(item.type)} 
              size={32} 
              color="#007AFF" 
            />
          </View>
          <View style={styles.contentInfo}>
            <Text style={styles.contentTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.contentDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.contentFooter}>
              <TouchableOpacity 
                style={styles.likeButton}
                onPress={() => handleLikeContent(item.id)}
              >
                <Ionicons 
                  name={likedContent.has(item.id) ? 'heart' : 'heart-outline'} 
                  size={20} 
                  color={likedContent.has(item.id) ? '#FF3B30' : '#666'} 
                />
              </TouchableOpacity>
              {item.duration && (
                <Text style={styles.contentDuration}>
                  {Math.floor(item.duration / 60)} min
                </Text>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

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
      <TimerModal 
        visible={showTimer} 
        onClose={() => setShowTimer(false)}
        duration={timerDuration}
        type={selectedType}
      />
      
      <Modal
        visible={showMindfulnessTimer}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMindfulnessTimer(false)}>
        <View style={styles.modalContainer}>
          <MeditationTimer
            duration={60}
            onComplete={handleMindfulnessComplete}
          />
        </View>
      </Modal>

      <Animated.View 
        style={[
          styles.header,
          {
            opacity: scrollY.interpolate({
              inputRange: [0, 100],
              outputRange: [1, 0.8],
            }),
          },
        ]}
      >
        <Text style={styles.title}>Explore</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search content..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, sortBy === 'recent' && styles.filterButtonActive]}
            onPress={() => setSortBy('recent')}
          >
            <Text style={[styles.filterText, sortBy === 'recent' && styles.filterTextActive]}>
              Recent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, sortBy === 'popular' && styles.filterButtonActive]}
            onPress={() => setSortBy('popular')}
          >
            <Text style={[styles.filterText, sortBy === 'popular' && styles.filterTextActive]}>
              Popular
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, sortBy === 'duration' && styles.filterButtonActive]}
            onPress={() => setSortBy('duration')}
          >
            <Text style={[styles.filterText, sortBy === 'duration' && styles.filterTextActive]}>
              Duration
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView 
        style={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {renderFeaturedSection()}
        
        {/* Daily Tip */}
        {dailyTip && (
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Daily Tip</Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipText}>{dailyTip.tip}</Text>
              <Text style={styles.tipDate}>{dailyTip.date}</Text>
            </View>
          </Animated.View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={`category-${category.id}`}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.id && styles.categoryCardSelected
                ]}
                onPress={() => handleCategoryPress(category)}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons 
                    name={category.icon} 
                    size={24} 
                    color={selectedCategory === category.id ? '#fff' : '#007AFF'} 
                  />
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription} numberOfLines={2}>
                  {category.description}
                </Text>
                <Text style={styles.categoryCount}>{category.count} items</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedCategory ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Content` : 'Featured Content'}
          </Text>
          <FlatList
            data={filteredContent}
            renderItem={renderContentItem}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            contentContainerStyle={styles.contentGrid}
            showsVerticalScrollIndicator={false}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews={true}
          />
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
  tipCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
  },
  tipText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  tipDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  categoryCard: {
    width: 200,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
  },
  categoryCardSelected: {
    backgroundColor: '#007AFF',
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  categoryCount: {
    fontSize: 12,
    color: '#007AFF',
  },
  contentGrid: {
    paddingHorizontal: 16,
  },
  contentCard: {
    marginBottom: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  contentImageContainer: {
    height: 140,
    backgroundColor: '#E3F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentInfo: {
    padding: 16,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  contentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  contentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentType: {
    fontSize: 12,
    color: '#007AFF',
    textTransform: 'uppercase',
  },
  likeButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 24,
  },
  timerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  timerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  timerButtonActive: {
    backgroundColor: '#FF3B30',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#333',
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
  contentDuration: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  featuredSection: {
    marginBottom: 24,
    overflow: 'hidden',
  },
  featuredGradient: {
    padding: 16,
    borderRadius: 16,
    margin: 16,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  featuredCard: {
    width: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
  },
  featuredIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  featuredCardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  contentGradient: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 
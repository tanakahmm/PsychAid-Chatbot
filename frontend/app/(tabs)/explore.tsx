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

interface DailyTip {
  id: string;
  tip: string;
  date: string;
}

type IconName = keyof typeof Ionicons.glyphMap;

interface QuickAction {
  id: string;
  title: string;
  icon: IconName;
  color: string;
  duration?: number;
  type: string;
}

interface Category {
  id: string;
  title: string;
  icon: IconName;
  description: string;
  color: string;
  route: string;
}

interface Practice {
  id: string;
  title: string;
  description: string;
  type: string;
  duration: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  benefits: string[];
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

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'quick-breathe',
    title: 'Quick Breathe',
    icon: 'water-outline',
    color: '#2196F3',
    duration: 60,
    type: 'breathing'
  },
  {
    id: 'quick-meditate',
    title: 'Quick Meditate',
    icon: 'sunny-outline',
    color: '#4CAF50',
    duration: 180,
    type: 'meditation'
  },
  {
    id: 'mood-check',
    title: 'Mood Check',
    icon: 'heart-outline',
    color: '#E91E63',
    type: 'mood'
  },
  {
    id: 'daily-exercise',
    title: 'Daily Exercise',
    icon: 'fitness-outline',
    color: '#FF9800',
    duration: 300,
    type: 'exercise'
  },
];

const PRACTICES: Practice[] = [
  {
    id: 'med-1',
    title: 'Mindful Breathing',
    description: 'Focus on your breath to reduce stress and anxiety',
    type: 'meditation',
    duration: 300,
    level: 'beginner',
    benefits: ['Reduces stress', 'Improves focus', 'Calms mind']
  },
  {
    id: 'med-2',
    title: 'Body Scan',
    description: 'Progressive relaxation for better sleep',
    type: 'meditation',
    duration: 600,
    level: 'intermediate',
    benefits: ['Better sleep', 'Reduces tension', 'Deep relaxation']
  },
  {
    id: 'breath-1',
    title: '4-7-8 Breathing',
    description: 'Calming breathing pattern for quick relaxation',
    type: 'breathing',
    duration: 180,
    level: 'beginner',
    benefits: ['Quick calm', 'Stress relief', 'Better focus']
  },
  {
    id: 'ex-1',
    title: 'Morning Energizer',
    description: 'Quick exercises to start your day',
    type: 'exercise',
    duration: 300,
    level: 'beginner',
    benefits: ['Boosts energy', 'Improves mood', 'Increases focus']
  },
];

const CATEGORIES: Category[] = [
  {
    id: 'meditation',
    title: 'Meditation',
    icon: 'leaf',
    description: 'Find peace and clarity through guided meditation sessions',
    color: '#4CAF50',
    route: '/meditation',
  },
  {
    id: 'anxiety',
    title: 'Anxiety Management',
    icon: 'heart',
    description: 'Learn techniques to manage anxiety and reduce its impact',
    color: '#2196F3',
    route: '/anxiety',
  },
  {
    id: 'sleep',
    title: 'Sleep Hygiene',
    icon: 'moon',
    description: 'Improve your sleep quality and overall well-being',
    color: '#673AB7',
    route: '/sleep',
  },
  {
    id: 'stress',
    title: 'Stress Relief',
    icon: 'water',
    description: 'Find ways to manage and reduce stress in your life',
    color: '#FF9800',
    route: '/stress',
  },
  {
    id: 'selfcare',
    title: 'Self-Care Tips',
    icon: 'happy',
    description: 'Practical tips for taking care of yourself',
    color: '#E91E63',
    route: '/selfcare',
  },
];

const getPracticeColor = (type: string): string => {
  const colors: { [key: string]: string } = {
    meditation: '#4CAF50',
    breathing: '#2196F3',
    exercise: '#FF9800',
  };
  return colors[type] || '#9C27B0';
};

const getLevelColor = (level: string): string => {
  const colors: { [key: string]: string } = {
    beginner: '#4CAF50',
    intermediate: '#FF9800',
    advanced: '#F44336',
  };
  return colors[level] || '#9C27B0';
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
  const [timerType, setTimerType] = useState('');
  const [showMindfulnessTimer, setShowMindfulnessTimer] = useState(false);
  const [mindfulnessCompleted, setMindfulnessCompleted] = useState(false);
  const fadeAnim = new Animated.Value(0);
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
            icon: 'leaf',
            description: 'Find peace and clarity through guided meditation sessions',
            color: '#4CAF50',
            route: '/meditation',
          },
          {
            id: 'anxiety',
            title: 'Anxiety Management',
            icon: 'heart',
            description: 'Learn techniques to manage anxiety and reduce its impact',
            color: '#2196F3',
            route: '/anxiety',
          },
          {
            id: 'sleep',
            title: 'Sleep Hygiene',
            icon: 'moon',
            description: 'Improve your sleep quality and overall well-being',
            color: '#673AB7',
            route: '/sleep',
          },
          {
            id: 'stress',
            title: 'Stress Relief',
            icon: 'water',
            description: 'Find ways to manage and reduce stress in your life',
            color: '#FF9800',
            route: '/stress',
          },
          {
            id: 'selfcare',
            title: 'Self-Care Tips',
            icon: 'happy',
            description: 'Practical tips for taking care of yourself',
            color: '#E91E63',
            route: '/selfcare',
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

  const filteredContent = [...recommendations].filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCategoryPress = (route: string) => {
    router.push(route);
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

  const getIconForType = (type: string): IconName => {
    const iconMap: { [key: string]: IconName } = {
      'meditation': 'leaf',
      'anxiety': 'heart',
      'sleep': 'moon',
      'stress': 'water',
      'selfcare': 'happy',
    };
    return iconMap[type] || 'help-circle';
  };

  const handleTimerComplete = async () => {
    try {
      if (timerType === 'Meditation') {
        await ApiService.updateMeditationProgress(timerDuration / 60);
      }
      Alert.alert('Success', `${timerType} session completed!`);
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

  const handleQuickAction = (action: QuickAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (action.type === 'mood') {
      router.push('/(tabs)/mood');
      return;
    }

    if (action.duration) {
      setTimerDuration(action.duration);
      setTimerType(action.title);
      setShowTimer(true);
    }
  };

  const handlePracticePress = (practice: Practice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimerDuration(practice.duration);
    setTimerType(practice.title);
    setShowTimer(true);
  };

  const renderQuickAction = ({ item }: { item: QuickAction }) => (
    <TouchableOpacity
      style={[styles.quickActionCard, { backgroundColor: item.color + '15' }]}
      onPress={() => handleQuickAction(item)}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <Text style={styles.quickActionTitle}>{item.title}</Text>
      {item.duration && (
        <Text style={[styles.quickActionDuration, { color: item.color }]}>
          {Math.floor(item.duration / 60)} min
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderPractice = ({ item }: { item: Practice }) => (
    <TouchableOpacity
      style={styles.practiceCard}
      onPress={() => handlePracticePress(item)}
    >
      <View style={styles.practiceHeader}>
        <View style={[styles.practiceType, { backgroundColor: getPracticeColor(item.type) + '15' }]}>
          <Text style={[styles.practiceTypeText, { color: getPracticeColor(item.type) }]}>
            {item.type}
          </Text>
        </View>
        <View style={[styles.practiceLevel, { backgroundColor: getLevelColor(item.level) + '15' }]}>
          <Text style={[styles.practiceLevelText, { color: getLevelColor(item.level) }]}>
            {item.level}
          </Text>
        </View>
      </View>
      <Text style={styles.practiceTitle}>{item.title}</Text>
      <Text style={styles.practiceDescription}>{item.description}</Text>
      <View style={styles.practiceBenefits}>
        {item.benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitTag}>
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>
      <View style={styles.practiceFooter}>
        <Ionicons name="time-outline" size={16} color="#666" />
        <Text style={styles.practiceDuration}>
          {Math.floor(item.duration / 60)} min
        </Text>
      </View>
    </TouchableOpacity>
  );

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
            setTimerType(item.type.charAt(0).toUpperCase() + item.type.slice(1));
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
        type={timerType}
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

      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Choose a category to begin your wellness journey</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, { borderColor: category.color }]}
              onPress={() => handleCategoryPress(category.route)}
            >
              <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
                <Ionicons name={category.icon} size={32} color={category.color} />
              </View>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Ionicons name="chevron-forward" size={20} color={category.color} />
            </TouchableOpacity>
          ))}
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
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  categoriesGrid: {
    padding: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
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
  quickActionCard: {
    width: 120,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  quickActionDuration: {
    fontSize: 12,
    fontWeight: '500',
  },
  practiceCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  practiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  practiceType: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  practiceTypeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  practiceLevel: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  practiceLevelText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  practiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  practiceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  practiceBenefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  benefitTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  benefitText: {
    fontSize: 12,
    color: '#666',
  },
  practiceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  practiceDuration: {
    fontSize: 14,
    color: '#666',
  },
  contentCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  contentImageContainer: {
    width: '100%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentInfo: {
    padding: 16,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  contentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  contentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  likeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 
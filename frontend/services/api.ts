import axios from 'axios';
import { getEnvironment } from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create axios instance with default config
const api = axios.create({
  baseURL: getEnvironment().apiUrl,
  timeout: getEnvironment().timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    }
    return Promise.reject(error);
  }
);

export interface MoodEntry {
  mood: string;
  note?: string;
  timestamp: Date;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: string;
  duration?: number;
  content?: string;
}

export interface MoodData {
  timestamp: Date;
  score: number;
  message: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    name: string;
    email: string;
    user_type: 'parent' | 'student';
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  last_name: string;
  user_type: 'parent' | 'student';
  linked_children?: string[];
}

export const ApiService = {
  // Authentication
  login: async (email: string, password: string, userType: string): Promise<AuthResponse> => {
    try {
      // Validate required fields
      if (!email || !password || !userType) {
        throw new Error('Email, password, and user type are required');
      }

      const formData = new URLSearchParams();
      formData.append('username', `${email.trim()}:${userType}`);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.data || !response.data.access_token) {
        throw new Error('Invalid response from server');
      }

      // Store authentication data
      await AsyncStorage.setItem('token', response.data.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      await AsyncStorage.setItem('user_id', response.data.user.id);

      // Set authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;

      return response.data;
    } catch (error: any) {
      // Clear any stored data on error
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('user_id');
      delete api.defaults.headers.common['Authorization'];
      
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      }
      
      throw new Error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('user_id');
      delete api.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Chat endpoints
  sendMessage: async (text: string): Promise<string> => {
    try {
      const response = await api.post('/chat', { text });
      return response.data.response;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(error.response?.data?.detail || 'Chat service unavailable');
    }
  },

  publicChat: async (text: string): Promise<string> => {
    try {
      const response = await api.post('/chat/public', { text });
      return response.data.response;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Chat service unavailable');
    }
  },

  // Mood tracking endpoints
  saveMoodEntry: async (mood: string, note?: string): Promise<any> => {
    try {
      const response = await api.post('/mood', {
        mood,
        note,
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(error.response?.data?.detail || 'Failed to save mood');
    }
  },

  getMoodHistory: async () => {
    try {
      const response = await api.get('/mood/history');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        throw new Error('Session expired. Please login again.');
      }
      return [];
    }
  },

  getMoodInsights: async () => {
    try {
      const response = await api.get('/mood/insights');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        throw new Error('Session expired. Please login again.');
      }
      return null;
    }
  },

  // Resource endpoints
  getResourceById: async (id: string) => {
    try {
      const response = await api.get(`/resources/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch resource');
    }
  },

  // Achievement tracking
  updateMeditationProgress: async (duration: number) => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('Updating meditation progress:', {
        userId,
        duration,
        timestamp: new Date().toISOString()
      });

      const response = await api.post('/progress/meditation', {
        user_id: userId,
        duration,
        timestamp: new Date().toISOString()
      });

      if (!response.data) {
        throw new Error('No response received from server');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error updating meditation progress:', {
        status: error.response?.status,
        message: error.response?.data?.detail || error.message,
        data: error.response?.data
      });
      throw new Error(error.response?.data?.detail || 'Failed to update meditation progress');
    }
  },

  updateMindfulnessProgress: async (duration: number) => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('Updating mindfulness progress:', {
        userId,
        duration,
        timestamp: new Date().toISOString()
      });

      const response = await api.post('/progress/mindfulness', {
        user_id: userId,
        duration,
        timestamp: new Date().toISOString()
      });

      if (!response.data) {
        throw new Error('No response received from server');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error updating mindfulness progress:', {
        status: error.response?.status,
        message: error.response?.data?.detail || error.message,
        data: error.response?.data
      });
      throw new Error(error.response?.data?.detail || 'Failed to update mindfulness progress');
    }
  },

  storeMoodData: async (moodData: MoodData) => {
    try {
      const formattedData = {
        ...moodData,
        timestamp: new Date(moodData.timestamp).toISOString(),
        user_id: await AsyncStorage.getItem('user_id')
      };

      const response = await api.post('/mood', formattedData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Error storing mood data:', error.response?.data || error.message);
      throw error;
    }
  },

  getChildrenProgress: async (parentId: string) => {
    try {
      const response = await api.get(`/parent/${parentId}/children`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        throw new Error('Session expired. Please login again.');
      }
      throw error;
    }
  },

  getLinkedChildren: async (): Promise<Array<{ id: string, name: string }>> => {
    try {
      const response = await api.get('/users/linked-children');
      return response.data.children;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        throw new Error('Session expired. Please login again.');
      }
      throw error;
    }
  },

  getChildMoodHistory: async (childId: string) => {
    try {
      const response = await api.get(`/parent/child/${childId}/mood/history`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error('Not authorized to access this child\'s mood history');
      }
      throw new Error(error.response?.data?.detail || 'Failed to fetch child\'s mood history');
    }
  },

  getRecommendations: async () => {
    try {
      const response = await api.get('/recommendations');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching recommendations:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch recommendations');
    }
  },

  signup: async (email: string, password: string, name: string, lastName: string, userType: string, childEmail?: string): Promise<AuthResponse> => {
    try {
      // Validate required fields
      if (!email || !password || !name || !lastName || !userType) {
        throw new Error('All fields are required');
      }

      // Validate user type
      const validUserType = userType.toLowerCase();
      if (!['parent', 'student'].includes(validUserType)) {
        throw new Error('Invalid user type. Must be either "parent" or "student"');
      }

      // Validate child email if parent
      if (validUserType === 'parent' && !childEmail) {
        throw new Error('Child email is required for parent signup');
      }

      const response = await api.post('/auth/signup', {
        email: email.trim(),
        password,
        name: name.trim(),
        last_name: lastName.trim(),
        user_type: validUserType,
        child_email: validUserType === 'parent' ? childEmail?.trim() : null
      });

      if (response.data.access_token) {
        await AsyncStorage.setItem('token', response.data.access_token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        await AsyncStorage.setItem('user_id', response.data.user.id);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      }

      return response.data;
    } catch (error: any) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('user_id');
      delete api.defaults.headers.common['Authorization'];
      
      if (error.response?.status === 422) {
        const detail = error.response.data?.detail;
        if (Array.isArray(detail) && detail.length > 0) {
          throw new Error(detail[0].msg || 'Invalid input format');
        }
        throw new Error(error.response.data?.detail || 'Invalid input format');
      }
      throw new Error(error.response?.data?.detail || error.message || 'Signup failed');
    }
  },

  // Progress tracking endpoints
  saveProgress: async (type: string, category: string, duration: number, moodBefore: number, moodAfter: number, engagementLevel: number, notes: string = ''): Promise<any> => {
    try {
      const response = await api.post('/progress', {
        type,
        category,
        duration,
        mood_before: moodBefore,
        mood_after: moodAfter,
        engagement_level: engagementLevel,
        notes,
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(error.response?.data?.detail || 'Failed to save progress');
    }
  },

  getProgress: async (category?: string): Promise<any> => {
    try {
      const response = await api.get('/progress', {
        params: { category }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        throw new Error('Session expired. Please login again.');
      }
      return {
        total_sessions: 0,
        total_minutes: 0,
        categories_used: 0,
        latest_session: null,
        mood_improvement: {
          average: 0,
          total_improvements: 0
        },
        engagement: {
          average: 0,
          total_sessions: 0
        },
        weekly_progress: []
      };
    }
  },

  getProgressByCategory: async (category: string): Promise<any> => {
    try {
      const response = await api.get(`/progress/category/${category}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        throw new Error('Session expired. Please login again.');
      }
      return {
        total_sessions: 0,
        total_minutes: 0,
        categories_used: 0,
        latest_session: null,
        mood_improvement: {
          average: 0,
          total_improvements: 0
        },
        engagement: {
          average: 0,
          total_sessions: 0
        },
        weekly_progress: []
      };
    }
  },

  getChildAchievements: async (childId: string) => {
    try {
      const response = await api.get(`/progress/child/${childId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get child achievements error:', error);
      throw error;
    }
  },

  getChildCategoryStats: async (childId: string, category: string) => {
    try {
      const response = await api.get(`/progress/child/${childId}/category/${category}`);
      return response.data;
    } catch (error: any) {
      console.error('Get child category stats error:', error);
      throw error;
    }
  },
};

export default api; 
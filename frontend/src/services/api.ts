import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token and user data on unauthorized
      await AsyncStorage.multiRemove(['token', 'user']);
      // You might want to trigger a navigation to login here
      return Promise.reject({
        status: 401,
        message: 'Session expired. Please login again.',
        data: null
      });
    }

    if (error.response) {
      console.error('Response error:', error.response);
      return Promise.reject({
        status: error.response.status,
        message: error.response.data.detail || 'An error occurred',
        data: error.response.data
      });
    } else if (error.request) {
      console.error('Request error:', error.request);
      return Promise.reject({
        status: 0,
        message: 'Network error. Please check your connection and try again.',
        data: null
      });
    } else {
      console.error('Error:', error.message);
      return Promise.reject({
        status: 0,
        message: error.message,
        data: null
      });
    }
  }
);

// API methods
export const authAPI = {
  signup: async (userData: any) => {
    try {
      const response = await api.post('/auth/signup', userData);
      if (response.data.access_token) {
        await AsyncStorage.setItem('token', response.data.access_token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  },

  login: async (email: string, password: string, userType: string) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', `${email}:${userType}`);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.data.access_token) {
        await AsyncStorage.setItem('token', response.data.access_token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response) {
        throw new Error(error.response.data.detail || 'Login failed');
      }
      throw new Error('Network error. Please check your connection.');
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'user']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error: any) {
      console.error('Get current user error:', error);
      throw error;
    }
  }
};

export const chatAPI = {
  sendMessage: async (message: string) => {
    try {
      const response = await api.post('/chat', { text: message });
      return response.data;
    } catch (error: any) {
      console.error('Send message error:', error);
      throw error;
    }
  },

  sendPublicMessage: async (message: string) => {
    try {
      const response = await api.post('/chat/public', { text: message });
      return response.data;
    } catch (error: any) {
      console.error('Send public message error:', error);
      throw error;
    }
  }
};

export const moodAPI = {
  saveMood: async (moodData: any) => {
    try {
      const response = await api.post('/mood', moodData);
      return response.data;
    } catch (error: any) {
      console.error('Save mood error:', error);
      throw error;
    }
  },

  getMoodHistory: async () => {
    try {
      const response = await api.get('/mood/history');
      return response.data;
    } catch (error: any) {
      console.error('Get mood history error:', error);
      throw error;
    }
  }
};

export const progressAPI = {
  getProgress: async (category?: string) => {
    try {
      const response = await api.get('/progress', {
        params: { category }
      });
      return response.data;
    } catch (error: any) {
      console.error('Get progress error:', error);
      throw error;
    }
  },

  getProgressByCategory: async (category: string) => {
    try {
      const response = await api.get(`/progress/category/${category}`);
      return response.data;
    } catch (error: any) {
      console.error('Get progress by category error:', error);
      throw error;
    }
  },

  saveProgress: async (progressData: any) => {
    try {
      const response = await api.post('/progress', progressData);
      return response.data;
    } catch (error: any) {
      console.error('Save progress error:', error);
      throw error;
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
  }
};

export { api as default, authAPI, chatAPI, moodAPI, progressAPI }; 
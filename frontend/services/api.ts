import axios from 'axios';

const BASE_URL = 'http://192.168.0.169:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export const ApiService = {
  // Chat endpoints
  sendMessage: async (text: string) => {
    try {
      const response = await api.post('/chat', { text });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Mood tracking endpoints
  saveMoodEntry: async (entry: MoodEntry) => {
    try {
      const response = await api.post('/mood', entry);
      return response.data;
    } catch (error) {
      console.error('Error saving mood entry:', error);
      throw error;
    }
  },

  getMoodHistory: async () => {
    try {
      const response = await api.get('/mood/history');
      return response.data.entries;
    } catch (error) {
      console.error('Error getting mood history:', error);
      throw error;
    }
  },

  // Resource endpoints
  getResources: async (type?: string) => {
    try {
      const response = await api.get('/resources', {
        params: type ? { type } : undefined,
      });
      return response.data.resources;
    } catch (error) {
      console.error('Error getting resources:', error);
      throw error;
    }
  },

  getResourceById: async (id: string) => {
    try {
      const response = await api.get(`/resources/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error getting resource:', error);
      throw error;
    }
  },
}; 
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/api';
import { router } from 'expo-router';

interface User {
  id: string;
  name: string;
  email: string;
  user_type: 'student' | 'parent';
  last_name?: string;
  linked_children?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string, userType: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        // Get current user data
        const userData = await ApiService.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, userType: string) => {
    try {
      setLoading(true);
      const response = await ApiService.login(email, password, userType);
      
      if (!response.access_token || !response.user) {
        throw new Error('Invalid response from server');
      }

      // Store token and user ID
      await AsyncStorage.setItem('token', response.access_token);
      await AsyncStorage.setItem('user_id', response.user.id);
      setToken(response.access_token);
      
      // Set user data
      setUser(response.user);

      // Navigate to mood page
      router.replace('/(tabs)/mood');
    } catch (error: any) {
      console.error('Login failed:', error);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user_id');
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await ApiService.logout();
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user_id');
      setToken(null);
      setUser(null);
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, setUser, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
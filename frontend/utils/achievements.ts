import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  duration: number;
  category: 'meditation' | 'anxiety' | 'sleep' | 'stress' | 'selfcare';
}

const ACHIEVEMENTS_STORAGE_KEY = 'user_achievements';

export const saveAchievement = async (achievement: Achievement) => {
  try {
    // Get existing achievements
    const existingData = await AsyncStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    const achievements = existingData ? JSON.parse(existingData) : [];
    
    // Add new achievement
    achievements.push(achievement);
    
    // Save back to storage
    await AsyncStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(achievements));
    return true;
  } catch (error) {
    console.error('Error saving achievement:', error);
    return false;
  }
};

export const getAchievements = async (): Promise<Achievement[]> => {
  try {
    const data = await AsyncStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting achievements:', error);
    return [];
  }
};

export const getCategoryStats = async (category: Achievement['category']) => {
  const achievements = await getAchievements();
  const categoryAchievements = achievements.filter(a => a.category === category);
  
  return {
    totalSessions: categoryAchievements.length,
    totalMinutes: categoryAchievements.reduce((acc, curr) => acc + curr.duration, 0) / 60,
    lastSession: categoryAchievements[categoryAchievements.length - 1]?.date || null,
  };
};

export const getAllStats = async () => {
  const achievements = await getAchievements();
  
  return {
    totalSessions: achievements.length,
    totalMinutes: achievements.reduce((acc, curr) => acc + curr.duration, 0) / 60,
    categoriesUsed: [...new Set(achievements.map(a => a.category))].length,
    lastSession: achievements[achievements.length - 1]?.date || null,
  };
}; 
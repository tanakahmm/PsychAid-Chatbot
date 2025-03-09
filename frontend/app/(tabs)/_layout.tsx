import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          elevation: Platform.OS === 'android' ? 5 : 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          borderTopWidth: 0,
          paddingBottom: 5,
          paddingTop: 5,
          height: 65,
          backgroundColor: '#FFFFFF',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 5,
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 3,
        },
        headerTintColor: '#2c3e50',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "chatbubbles" : "chatbubbles-outline"} 
              size={size + 2} 
              color={color}
              style={{ 
                marginBottom: -3,
                textShadowColor: focused ? 'rgba(76, 175, 80, 0.3)' : 'transparent',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 3,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          title: 'Mood',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "happy" : "happy-outline"} 
              size={size + 2} 
              color={color}
              style={{ 
                marginBottom: -3,
                textShadowColor: focused ? 'rgba(76, 175, 80, 0.3)' : 'transparent',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 3,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "compass" : "compass-outline"} 
              size={size + 2} 
              color={color}
              style={{ 
                marginBottom: -3,
                textShadowColor: focused ? 'rgba(76, 175, 80, 0.3)' : 'transparent',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 3,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "stats-chart" : "stats-chart-outline"} 
              size={size + 2} 
              color={color}
              style={{ 
                marginBottom: -3,
                textShadowColor: focused ? 'rgba(76, 175, 80, 0.3)' : 'transparent',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 3,
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
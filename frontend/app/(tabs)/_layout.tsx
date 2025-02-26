import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tabs.Screen
        name="mood"
        options={{
          title: 'Mood',
          tabBarIcon: ({ color }) => <Ionicons name="heart" size={24} color={color} />,
          tabBarLabel: 'Mood',
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubble" size={24} color={color} />,
          tabBarLabel: 'Chat',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Ionicons name="compass" size={24} color={color} />,
          tabBarLabel: 'Explore',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={24} color={color} />,
          tabBarLabel: 'Progress',
        }}
      />
    </Tabs>
  );
}
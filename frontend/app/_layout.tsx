import { Stack } from 'expo-router';
import { ResourceProvider } from '@/contexts/ResourceContext';

export default function RootLayout() {
  return (
    <ResourceProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ResourceProvider>
  );
} 
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to mood page on app start
    router.replace('/(tabs)/mood');
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
} 
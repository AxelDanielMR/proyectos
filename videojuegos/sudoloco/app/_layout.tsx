import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/providers/AppProviders';
import { useAuthStore } from '@features/auth';

function AuthGuard() {
  const { status } = useAuthStore();
  const { _startListener } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Start the Firebase Auth listener once on mount.
  useEffect(() => {
    const unsub = _startListener();
    return unsub;
  }, []);

  // Redirect based on auth status once resolved.
  useEffect(() => {
    if (status === 'loading') return;

    const inAuthGroup = segments[0] === '(auth)';

    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [status, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" backgroundColor="#efe1c6" />
      <AuthGuard />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f172a' },
          statusBarBackgroundColor: '#efe1c6',
          statusBarStyle: 'dark',
        }}
      />
    </AppProviders>
  );
}

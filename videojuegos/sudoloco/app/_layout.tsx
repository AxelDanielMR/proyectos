import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { AppProviders } from '@/providers/AppProviders';
import { useAuthStore } from '@features/auth';
import { useStatusBarConfig } from '@/providers/StatusBarProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function AuthGuard() {
  const { status } = useAuthStore();
  const { _startListener } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsub = _startListener();
    return unsub;
  }, []);

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

function RootLayoutContent() {
  const { config } = useStatusBarConfig();

  return (
    <>
      <StatusBar style={config.barStyle} backgroundColor={config.backgroundColor} />
      <AuthGuard />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f172a' },
          statusBarBackgroundColor: config.backgroundColor,
          statusBarStyle: config.barStyle,
        }}
      />
    </>
  );
}

export default function RootLayout() {
  // Carga en runtime (compatible con Expo Go). Cada peso es una familia propia;
  // el default global usa 'PixelifySans' (ver src/theme/typography.ts).
  const [fontsLoaded] = useFonts({
    PixelifySans: require('../assets/fonts/PixelifySans-Regular.ttf'),
    'PixelifySans-Medium': require('../assets/fonts/PixelifySans-Medium.ttf'),
    'PixelifySans-SemiBold': require('../assets/fonts/PixelifySans-SemiBold.ttf'),
    'PixelifySans-Bold': require('../assets/fonts/PixelifySans-Bold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <RootLayoutContent />
      </AppProviders>
    </GestureHandlerRootView>
  );
}

import '../global.css';
import { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AppProviders } from '@/providers/AppProviders';
import { useAuthStore } from '@features/auth';
import { useStatusBarConfig } from '@/providers/StatusBarProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from '@ui/primitives/Text';
import { colors } from '@theme/colors';

void SplashScreen.preventAutoHideAsync();

// Expo Router monta esto en vez de la pantalla rota si algo lanza durante el
// render — sin esto, cualquier throw deja una pantalla roja/blanca sin salida.
export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.title}>Algo salió mal</Text>
      <Text style={errorStyles.message}>{error.message}</Text>
      <Pressable style={errorStyles.button} onPress={retry}>
        <Text style={errorStyles.buttonText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: colors.bg.base,
  },
  title: { fontSize: 24, fontWeight: '900', color: colors.state.danger },
  message: { fontSize: 14, color: colors.text.secondary, textAlign: 'center' },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});

function AuthGuard() {
  const { status } = useAuthStore();
  const { _startListener } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsub = _startListener();
    return unsub;
  }, [_startListener]);

  useEffect(() => {
    if (status === 'loading') return;

    const inAuthGroup = segments[0] === '(auth)';

    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [status, segments, router]);

  return null;
}

function RootLayoutContent() {
  const { config } = useStatusBarConfig();

  return (
    <>
      <StatusBar
        style={config.barStyle}
        backgroundColor={config.backgroundColor}
      />
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
  const [fontsLoaded, fontError] = useFonts({
    PixelifySans: require('../assets/fonts/PixelifySans-Regular.ttf'),
    'PixelifySans-Medium': require('../assets/fonts/PixelifySans-Medium.ttf'),
    'PixelifySans-SemiBold': require('../assets/fonts/PixelifySans-SemiBold.ttf'),
    'PixelifySans-Bold': require('../assets/fonts/PixelifySans-Bold.ttf'),
  });

  useEffect(() => {
    if (fontError)
      console.warn(
        '[app] fuentes no cargaron, se usa la del sistema:',
        fontError,
      );
  }, [fontError]);

  const onLayoutRootView = useCallback(() => {
    // Si fontError está seteado, fontsLoaded se queda en false para siempre —
    // sin este OR, la pantalla de splash nunca se ocultaría.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // No bloquear el render en un error de fuentes: sin esto, una fuente que
  // falla en cargar deja la pantalla en blanco para siempre (fontsLoaded
  // nunca pasa a true). Con fontError, seguimos con la fuente del sistema.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AppProviders>
        <RootLayoutContent />
      </AppProviders>
    </GestureHandlerRootView>
  );
}

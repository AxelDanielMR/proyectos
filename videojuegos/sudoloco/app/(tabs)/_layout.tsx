import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="microjuegos" options={{ title: t('tabs.microgames') }} />
      <Tabs.Screen name="cuentos" options={{ title: t('tabs.stories') }} />
      <Tabs.Screen name="perfil" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}

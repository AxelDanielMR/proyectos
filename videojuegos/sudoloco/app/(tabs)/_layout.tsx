import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="microjuegos" options={{ title: t('tabs.microgames') }} />
      <Tabs.Screen name="cuentos" options={{ title: t('tabs.stories') }} />
      <Tabs.Screen name="perfil" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}

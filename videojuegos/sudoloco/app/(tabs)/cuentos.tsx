import { useCallback } from 'react';
import { View } from 'react-native';
import { Text } from '@ui/primitives/Text';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useStatusBarConfig } from '@/providers/StatusBarProvider';

export default function StoriesScreen() {
  const { t } = useTranslation();
  const { setConfig } = useStatusBarConfig();

  useFocusEffect(
    useCallback(() => {
      setConfig({ backgroundColor: '#0f172a', barStyle: 'light' });
    }, [setConfig])
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl text-white">{t('tabs.stories')}</Text>
      </View>
    </SafeAreaView>
  );
}

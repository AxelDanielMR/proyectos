import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@ui/primitives';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-4xl font-bold text-white">{t('home.title')}</Text>
        <Text className="mt-2 text-base text-slate-400">
          {t('home.subtitle')}
        </Text>

        <View className="mt-10 w-full gap-3">
          <Button label={t('home.modes.sudoloco')} variant="primary" />
          <Button label={t('home.modes.versusIslas')} variant="secondary" />
          <Button label={t('home.modes.versusMar')} variant="secondary" />
          <Button label={t('home.modes.story')} variant="secondary" />
          <Button label={t('home.modes.history')} variant="secondary" />
        </View>
      </View>
    </SafeAreaView>
  );
}

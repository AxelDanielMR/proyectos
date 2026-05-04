import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl text-white">{t('tabs.profile')}</Text>
      </View>
    </SafeAreaView>
  );
}

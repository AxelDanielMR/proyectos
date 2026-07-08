import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@ui/primitives/Text';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MicrogameGallery } from '@features/microgames';
import { useStatusBarConfig } from '@/providers/StatusBarProvider';
import { colors } from '@theme/colors';

export default function BibliotecaScreen() {
  const { t } = useTranslation();
  const { setConfig } = useStatusBarConfig();

  useFocusEffect(
    useCallback(() => {
      setConfig({ backgroundColor: '#0f172a', barStyle: 'light' });
    }, [setConfig])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Sin ScrollView: la galería ocupa el resto de la pantalla para que el
          overlay del runner cubra toda el área de juego sin scrollear. */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('biblioteca.title')}</Text>
        <Text style={styles.sectionLabel}>{t('biblioteca.microgamesSection')}</Text>
      </View>
      <View style={styles.gallery}>
        <MicrogameGallery />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.base },
  header: { paddingHorizontal: 24, paddingTop: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text.primary },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gallery: { flex: 1 },
});

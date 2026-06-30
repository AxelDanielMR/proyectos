import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { SudolocoScreen } from '@features/sudoloco';
import { useStatusBarConfig } from '@/providers/StatusBarProvider';

export default function SudolocoRoute() {
  const { setConfig } = useStatusBarConfig();

  useFocusEffect(
    useCallback(() => {
      setConfig({ backgroundColor: '#0f172a', barStyle: 'light' });
    }, [setConfig])
  );

  return <SudolocoScreen />;
}

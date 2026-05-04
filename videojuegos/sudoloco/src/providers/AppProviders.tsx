import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n from '@i18n/index';

import { QueryProvider } from './QueryProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryProvider>
        <SafeAreaProvider>{children}</SafeAreaProvider>
      </QueryProvider>
    </I18nextProvider>
  );
}

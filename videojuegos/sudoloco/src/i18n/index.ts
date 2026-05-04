import i18n from 'i18next';
import { getLocales } from 'expo-localization';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const FALLBACK: SupportedLanguage = 'es';

function detectLanguage(): SupportedLanguage {
  const code = getLocales()[0]?.languageCode ?? FALLBACK;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code)
    ? (code as SupportedLanguage)
    : FALLBACK;
}

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: detectLanguage(),
  fallbackLng: FALLBACK,
  interpolation: { escapeValue: false },
  returnNull: false,
  compatibilityJSON: 'v4',
});

export default i18n;

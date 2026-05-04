import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'sudoloco.app' });

export const StorageKeys = {
  language: 'app.language',
  symbolPackId: 'user.symbolPackId',
  difficulty: 'user.difficulty',
  inProgressGame: 'game.inProgress',
} as const;

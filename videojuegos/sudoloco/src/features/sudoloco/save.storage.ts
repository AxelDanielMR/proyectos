import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedRunSchema, type SavedRun } from './save';

// Clave del save de la run en curso. AsyncStorage funciona en Expo Go (a
// diferencia de MMKV, que requiere módulo nativo / dev build).
const SAVE_KEY = 'sudoloco.inProgressGame';

export async function persistSave(saved: SavedRun): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  } catch (e) {
    console.warn('[sudoloco] persistSave failed', e);
  }
}

export async function loadSave(): Promise<SavedRun | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = SavedRunSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      await AsyncStorage.removeItem(SAVE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    await AsyncStorage.removeItem(SAVE_KEY);
    return null;
  }
}

export async function clearSave(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.warn('[sudoloco] clearSave failed', e);
  }
}

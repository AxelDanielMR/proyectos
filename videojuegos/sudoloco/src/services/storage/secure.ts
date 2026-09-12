import * as SecureStore from 'expo-secure-store';

export async function setSecure(key: string, value: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch (err) {
    console.warn(`[secure] setItemAsync falló para "${key}":`, err);
    return false;
  }
}

export async function getSecure(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.warn(`[secure] getItemAsync falló para "${key}":`, err);
    return null;
  }
}

export async function deleteSecure(key: string): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch (err) {
    console.warn(`[secure] deleteItemAsync falló para "${key}":`, err);
    return false;
  }
}

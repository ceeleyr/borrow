import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCache } from './cache';

/** Instance cache yang dipakai seluruh aplikasi (AsyncStorage: device native, localStorage di web). */
export const appCache = createCache({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
  getAllKeys: () => AsyncStorage.getAllKeys(),
});

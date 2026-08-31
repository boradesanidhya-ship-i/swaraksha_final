import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SERVER_URL: '@swaraksha_server_url',
  RECENT_ADDS: '@swaraksha_recent_adds',
};

export const DEFAULT_SERVER_URL = 'http://10.208.73.233:8000'; // Current laptop Wi-Fi IP

export async function getServerUrl() {
  try {
    const url = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL);
    return url || DEFAULT_SERVER_URL;
  } catch (e) {
    return DEFAULT_SERVER_URL;
  }
}

export async function setServerUrl(url) {
  try {
    // Strip trailing slash if present
    const cleaned = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, cleaned);
    return cleaned;
  } catch (e) {
    console.error('Error saving server URL:', e);
    return url;
  }
}

export async function getRecentAdds() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_ADDS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export async function saveRecentAdd(personId, count) {
  try {
    const current = await getRecentAdds();
    const updated = { ...current, [personId]: count };
    await AsyncStorage.setItem(STORAGE_KEYS.RECENT_ADDS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return {};
  }
}

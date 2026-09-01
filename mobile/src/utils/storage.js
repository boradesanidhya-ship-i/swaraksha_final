import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SERVER_URL: '@swaraksha_server_url',
  RECENT_ADDS: '@swaraksha_recent_adds',
  AUTH_TOKEN: '@swaraksha_auth_token',
  USER_PROFILE: '@swaraksha_user_profile',
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

// ── Auth Storage Helpers ───────────────────────────────────────────────────

export async function getAuthToken() {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch (e) {
    return null;
  }
}

export async function setAuthToken(token) {
  try {
    if (token) {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
  } catch (e) {
    console.error('Error storing auth token:', e);
  }
}

export async function getUserProfile() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function setUserProfile(profile) {
  try {
    if (profile) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    }
  } catch (e) {
    console.error('Error storing user profile:', e);
  }
}

export async function clearAuth() {
  try {
    await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.USER_PROFILE]);
  } catch (e) {
    console.error('Error clearing auth:', e);
  }
}

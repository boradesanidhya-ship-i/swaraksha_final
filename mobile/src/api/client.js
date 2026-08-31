import axios from 'axios';
import { File } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { getServerUrl } from '../utils/storage';

/**
 * Creates an Axios instance with the latest server URL configured in storage.
 */
export async function getApiClient(timeoutMs = 60000) {
  const baseURL = await getServerUrl();
  return axios.create({
    baseURL,
    timeout: timeoutMs,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Helper to convert any local file URI into a Base64 string across Expo SDK versions.
 */
async function uriToBase64(uri) {
  // Method 1: Try the new Expo SDK 57 File class
  try {
    const file = new File(uri);
    if (file && typeof file.base64 === 'function') {
      const b64 = await file.base64();
      if (b64) return `data:image/jpeg;base64,${b64}`;
    }
  } catch (e) {}

  // Method 2: Try legacy FileSystem
  try {
    if (LegacyFileSystem?.readAsStringAsync) {
      const b64 = await LegacyFileSystem.readAsStringAsync(uri, {
        encoding: LegacyFileSystem.EncodingType?.Base64 || 'base64',
      });
      if (b64) return `data:image/jpeg;base64,${b64}`;
    }
  } catch (e) {}

  // Method 3: Standard fetch + FileReader fallback
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    throw new Error(`Could not read image file at ${uri}: ${e.message}`);
  }
}

/**
 * Health check to verify connection to the backend server.
 */
export async function checkServerHealth(customUrl = null) {
  try {
    const url = (customUrl || (await getServerUrl())).replace(/\/+$/, '');
    const res = await axios.get(`${url}/`, { timeout: 4000 });
    return {
      online: true,
      data: res.data,
      url,
    };
  } catch (err) {
    return {
      online: false,
      error: err.message,
      code: err.code,
      url: customUrl || (await getServerUrl()),
    };
  }
}

/**
 * Get all registered protected identities.
 */
export async function fetchPersons() {
  const client = await getApiClient();
  const res = await client.get('/api/persons');
  return res.data;
}

/**
 * Delete a protected identity and all associated face embeddings.
 */
export async function removePerson(personId) {
  const client = await getApiClient();
  const res = await client.delete(`/api/persons/${encodeURIComponent(personId)}`);
  return res.data;
}

/**
 * Register a new protected identity with reference images using Base64 JSON.
 */
export async function registerIdentity(personId, name, imageFiles) {
  const client = await getApiClient(180000); // 3 minutes

  const base64Images = [];
  for (let idx = 0; idx < imageFiles.length; idx++) {
    const b64 = await uriToBase64(imageFiles[idx].uri);
    base64Images.push(b64);
  }

  const res = await client.post('/api/register-base64', {
    person_id: personId.trim(),
    name: name.trim(),
    images: base64Images,
  });

  return res.data;
}

/**
 * Scan an image for identity matches & AI manipulation using Base64.
 */
export async function scanFaceImage(imageUri, fileName = 'scan_capture.jpg') {
  const client = await getApiClient(120000);
  const b64 = await uriToBase64(imageUri);

  const res = await client.post('/api/scan-base64', {
    image: b64,
    filename: fileName,
  });

  return res.data;
}

export async function scanVideoFile(videoUri, fileName = 'upload.mp4') {
  const client = await getApiClient(300000); // 5 minutes for video analysis
  const b64 = await uriToBase64(videoUri);

  const res = await client.post('/api/scan-video-base64', {
    video: b64,
    filename: fileName,
  });

  return res.data;
}

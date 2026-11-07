import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { resolveApiBaseUrl } from '../lib/api-url';
import { createHttpClient } from './http';
import { createApiServices } from './api';

let token: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export const API_BASE_URL = resolveApiBaseUrl({
  envUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  hostUri: Constants.expoConfig?.hostUri ?? null,
  webHostname: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hostname : null,
});

const http = createHttpClient({
  baseURL: API_BASE_URL,
  getToken: () => token,
  onUnauthorized: () => unauthorizedHandler?.(),
});

/** Satu-satunya pintu ke backend untuk seluruh UI. */
export const services = createApiServices(http);

export function setAuthToken(value: string | null) {
  token = value;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

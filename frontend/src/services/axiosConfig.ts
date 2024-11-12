/**
 * @file axiosConfig.ts
 * @description Axios configuration with cookie token handling
 */

import axios from 'axios';
import frontendLogger from '@/config/frontendLogger';

export const TokenService = {
  getAccessToken: (): string | null => {
    const token = document.cookie.split(';')
      .find(cookie => cookie.trim().startsWith('accessToken='));
    return token ? token.split('=')[1].trim() : null;
  },
  
  setTokens: (accessToken: string, refreshToken?: string): void => {
    // Set token as HttpOnly cookie
    document.cookie = `accessToken=${accessToken}; path=/; secure; samesite=strict`;
    if (refreshToken) {
      document.cookie = `refreshToken=${refreshToken}; path=/; secure; samesite=strict`;
    }
  },
  
  clearTokens: (): void => {
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
};

// Création de l'instance axios
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5001',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true // Important pour les cookies
});

// Intercepteur de requête
axiosInstance.interceptors.request.use(
  (config) => {
    // Ajout du préfixe /api
    if (config.url && !config.url.startsWith('/api')) {
      config.url = `/api${config.url.startsWith('/') ? config.url : `/${config.url}`}`;
    }

    // Récupération du token depuis le cookie et ajout à l'en-tête
    const token = TokenService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      frontendLogger.debug('Request with token:', {
        url: config.url,
        method: config.method,
        hasToken: true
      });
    } else {
      frontendLogger.warn('No token found for request:', {
        url: config.url,
        method: config.method
      });
    }

    return config;
  },
  (error) => {
    frontendLogger.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Intercepteur de réponse
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      TokenService.clearTokens();
      window.dispatchEvent(new CustomEvent('auth:error', {
        detail: { message: 'Session expired' }
      }));
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

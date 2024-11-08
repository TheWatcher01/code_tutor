/**
 * @file axiosConfig.ts
 * @author TheWatcher01
 * @date 07-11-2024
 * @description Enhanced Axios configuration with TypeScript support
 */

import axios, { 
  AxiosError, 
  AxiosInstance, 
  InternalAxiosRequestConfig,
  AxiosResponse
} from 'axios';
import frontendLogger from '@/config/frontendLogger';

// Types
interface RefreshTokenResponse {
  data: {
    accessToken: string;
    refreshToken?: string;
  };
  message?: string;
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  metadata?: {
    startTime: number;
  };
}

// Constants
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const AUTH_ERRORS = {
  TOKEN_EXPIRED: 'token_expired',
  INVALID_TOKEN: 'invalid_token',
  NO_TOKEN: 'no_token',
  REFRESH_FAILED: 'refresh_failed'
} as const;

// Token management
const TokenService = {
  getAccessToken: (): string | null => localStorage.getItem('token'),
  
  getRefreshToken: (): string | null => localStorage.getItem('refreshToken'),
  
  setTokens: (accessToken: string, refreshToken?: string): void => {
    localStorage.setItem('token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  },
  
  clearTokens: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  isTokenExpired: (error: AxiosError<ApiError>): boolean => {
    return error.response?.status === 401 && 
           error.response?.data?.code === AUTH_ERRORS.TOKEN_EXPIRED;
  }
};

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor with TypeScript support
axiosInstance.interceptors.request.use(
  (config: CustomAxiosRequestConfig): CustomAxiosRequestConfig => {
    const requestStartTime = Date.now();
    const token = TokenService.getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request timing tracking
    config.metadata = { startTime: requestStartTime };

    frontendLogger.debug('Request started:', {
      url: config.url,
      method: config.method?.toUpperCase(),
      hasToken: !!token
    });

    return config;
  },
  (error: AxiosError): Promise<never> => {
    frontendLogger.error('Request interceptor error:', {
      message: error.message,
      config: {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase()
      }
    });
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling and token refresh
axiosInstance.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    const config = response.config as CustomAxiosRequestConfig;
    const requestStartTime = config.metadata?.startTime;
    
    if (requestStartTime) {
      const duration = Date.now() - requestStartTime;
      frontendLogger.debug('Request completed:', {
        url: response.config.url,
        method: response.config.method?.toUpperCase(),
        status: response.status,
        duration: `${duration}ms`
      });
    }
    return response;
  },
  async (error: AxiosError<ApiError>): Promise<AxiosResponse> => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    if (!originalRequest) {
      frontendLogger.error('No original request config found in error');
      return Promise.reject(error);
    }

    // Handle token refresh
    if (TokenService.isTokenExpired(error) && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = TokenService.getRefreshToken();

      if (!refreshToken) {
        TokenService.clearTokens();
        window.location.href = '/login?error=refresh_token_missing';
        return Promise.reject(error);
      }

      try {
        frontendLogger.debug('Attempting token refresh');
        
        const response = await axios.post<RefreshTokenResponse>(
          `${API_URL}/auth/refresh-token`,
          { refreshToken },
          { withCredentials: true }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        
        TokenService.setTokens(accessToken, newRefreshToken);
        
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        frontendLogger.info('Token refresh successful');
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        frontendLogger.error('Token refresh failed:', {
          error: refreshError instanceof Error ? refreshError.message : 'Unknown error',
          originalError: error.message
        });

        TokenService.clearTokens();

        // Custom event for auth errors
        window.dispatchEvent(new CustomEvent('auth:error', {
          detail: {
            code: AUTH_ERRORS.REFRESH_FAILED,
            message: 'Session expired. Please login again.'
          }
        }));

        window.location.href = '/login?error=session_expired';
        return Promise.reject(refreshError);
      }
    }

    // Log other errors
    frontendLogger.error('Response error:', {
      url: originalRequest.url,
      method: originalRequest.method?.toUpperCase(),
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });

    return Promise.reject(error);
  }
);

export default axiosInstance;
export { TokenService, AUTH_ERRORS, type ApiError };

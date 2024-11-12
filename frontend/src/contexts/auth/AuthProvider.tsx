/**
 * @file AuthProvider.tsx
 * @description Auth provider with ESLint fixes
 * @author TheWatcher
 * @date 2024-11-08
 */

import React, { useReducer, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '@/services/axiosConfig';
import { TokenService } from '@/services/axiosConfig';
import frontendLogger from '@/config/frontendLogger';
import { authReducer, initialState } from './authReducer';
import { AUTH_EVENTS, AUTH_ERROR_CODES } from '@/constants/auth';
import { AuthContext } from './AuthContext';
import type { User, AuthContextType, AuthResponse, AuthError } from '@/types/auth';
import { ROUTES } from '@/config/route';

const AUTH_STORAGE = {
  INTENDED_PATH: 'intendedPath'
} as const;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();

  const logout = useCallback(async () => {
    frontendLogger.debug('Starting logout process');

    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      frontendLogger.warn('Logout API call failed, continuing cleanup:', error);
    }

    // Always clean up
    TokenService.clearTokens();
    sessionStorage.clear();
    dispatch({ type: 'LOGOUT' });
    window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGOUT));
    navigate(ROUTES.LOGIN, { replace: true });
  }, [navigate]);

  const loadUserProfile = useCallback(async () => {
    frontendLogger.debug('Loading user profile...');

    try {
      const startTime = performance.now();
      const response = await axios.get<AuthResponse>('/api/users/profile');

      if (!response.data?.data?.user) {
        throw new Error('Invalid user data received');
      }

      const user = response.data.data.user;
      dispatch({ type: 'SET_USER', payload: user });

      frontendLogger.info('User profile loaded', {
        userId: user.id,
        duration: `${Math.round(performance.now() - startTime)}ms`
      });

      return user;
    } catch (error) {
      const authError = error as AuthError;
      frontendLogger.error('Profile load failed:', { error: authError });
      dispatch({ type: 'SET_ERROR', payload: authError.message });
      throw error;
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    frontendLogger.debug('Starting auth refresh');

    try {
      dispatch({ type: 'REFRESH_START' });
      await loadUserProfile();
      dispatch({ type: 'REFRESH_SUCCESS' });
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.TOKEN_REFRESHED));
    } catch (error) {
      dispatch({ type: 'REFRESH_FAILURE' });
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.SESSION_EXPIRED));
      await logout();
    }
  }, [loadUserProfile, logout]);

  const login = useCallback(async (accessToken: string, refreshToken?: string) => {
    frontendLogger.debug('Starting login process', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken
    });

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Set tokens first
      TokenService.setTokens(accessToken, refreshToken);

      // Load user profile
      await loadUserProfile();

      // Get redirect path or default to playground
      const redirectPath = sessionStorage.getItem(AUTH_STORAGE.INTENDED_PATH) || ROUTES.PLAYGROUND;
      sessionStorage.removeItem(AUTH_STORAGE.INTENDED_PATH);

      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN_SUCCESS));
      navigate(redirectPath, { replace: true });
    } catch (error) {
      const authError = error as AuthError;
      frontendLogger.error('Login failed:', { error: authError });

      TokenService.clearTokens();
      dispatch({
        type: 'SET_ERROR',
        payload: authError.message || 'Authentication failed'
      });

      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN_ERROR, {
        detail: { error: authError }
      }));

      navigate(ROUTES.LOGIN, { replace: true });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [loadUserProfile, navigate]); // Removed unnecessary logout dependency

  const updateUser = useCallback((userData: Partial<User>) => {
    frontendLogger.debug('Updating user data');

    if (state.user) {
      const updatedUser = { ...state.user, ...userData };
      dispatch({ type: 'SET_USER', payload: updatedUser });
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.PROFILE_UPDATED));
    } else {
      frontendLogger.warn('Attempted to update user data with no active user');
    }
  }, [state.user]);

  // Initial auth check
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = TokenService.getAccessToken();
        if (token) {
          await refreshAuth();
        }
      } catch (error) {
        frontendLogger.error('Initial auth check failed:', error);
        TokenService.clearTokens();
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, [refreshAuth]);

  // Auth error handler
  React.useEffect(() => {
    const handleAuthError = (event: CustomEvent<AuthError>) => {
      frontendLogger.error('Auth error:', event.detail);

      if (event.detail.code === AUTH_ERROR_CODES.TOKEN_EXPIRED) {
        logout();
      } else {
        dispatch({ type: 'SET_ERROR', payload: event.detail.message });
      }
    };

    window.addEventListener('auth:error', handleAuthError as EventListener);
    return () => {
      window.removeEventListener('auth:error', handleAuthError as EventListener);
    };
  }, [logout]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshAuth,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

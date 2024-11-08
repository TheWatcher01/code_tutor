/**
 * @file contexts/auth/AuthContext.tsx
 * @description Authentication context provider
 */

import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '@/services/axiosConfig';
import { TokenService } from '@/services/axiosConfig';
import frontendLogger from '@/config/frontendLogger';
import type {
  User,
  AuthState,
  AuthContextType,
  AuthResponse,
  AuthError,
} from '@/types/auth';
import { AUTH_EVENTS } from '@/constant/auth';

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null
};

// Actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGOUT' };

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        error: null
      };
    case 'SET_USER':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        isLoading: false,
        error: null
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false
      };
    default:
      return state;
  }
};

// Context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider Component
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();

  // Load user profile
  const loadUserProfile = useCallback(async () => {
    try {
      const response = await axios.get<AuthResponse>('/users/profile');
      dispatch({ type: 'SET_USER', payload: response.data.data.user });

      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.PROFILE_UPDATED, {
        detail: { user: response.data.data.user }
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load user profile';
      frontendLogger.error('Failed to load user profile:', { error });
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  // Login
  const login = useCallback(async (accessToken: string, refreshToken?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      TokenService.setTokens(accessToken, refreshToken);
      await loadUserProfile();

      frontendLogger.info('Login successful');
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN_SUCCESS));
    } catch (error) {
      const authError = error as AuthError;
      frontendLogger.error('Login failed:', authError);

      dispatch({
        type: 'SET_ERROR',
        payload: authError.message || 'Authentication failed'
      });

      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN_ERROR, {
        detail: { error: authError }
      }));

      throw error;
    }
  }, [loadUserProfile]);

  // Logout
  const logout = useCallback(async () => {
    try {
      await axios.post('/auth/logout');
    } catch (error) {
      frontendLogger.error('Logout API call failed:', error);
    } finally {
      TokenService.clearTokens();
      dispatch({ type: 'LOGOUT' });
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGOUT));
      navigate('/login');
    }
  }, [navigate]);

  // Refresh authentication
  const refreshAuth = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await loadUserProfile();
    } catch (error) {
      frontendLogger.error('Auth refresh failed:', error);
      dispatch({ type: 'LOGOUT' });
      navigate('/login');
    }
  }, [loadUserProfile, navigate]);

  // Update user
  const updateUser = useCallback((userData: Partial<User>) => {
    if (state.user) {
      const updatedUser = { ...state.user, ...userData };
      dispatch({ type: 'SET_USER', payload: updatedUser });
    }
  }, [state.user]);

  // Initial auth check
  useEffect(() => {
    const token = TokenService.getAccessToken();
    if (token) {
      refreshAuth();
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [refreshAuth]);

  // Listen for auth events
  useEffect(() => {
    const handleAuthError = (event: CustomEvent<AuthError>) => {
      dispatch({
        type: 'SET_ERROR',
        payload: event.detail.message
      });
      logout();
    };

    window.addEventListener('auth:error', handleAuthError as EventListener);
    return () => window.removeEventListener('auth:error', handleAuthError as EventListener);
  }, [logout]);

  const value = {
    ...state,
    login,
    logout,
    refreshAuth,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook file: src/hooks/useAuth.ts
function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthProvider };
export { useAuth };

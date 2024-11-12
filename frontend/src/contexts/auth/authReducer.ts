// File: src/contexts/auth/authReducer.ts

import type { AuthState, User } from '@/types/auth';

export type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS' }
  | { type: 'REFRESH_FAILURE' };

export const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null
};

export const authReducer = (state: AuthState, action: AuthAction): AuthState => {
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
    case 'REFRESH_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    case 'REFRESH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        error: null
      };
    case 'REFRESH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: 'Session expired'
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

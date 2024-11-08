/**
 * @file auth.ts
 * @author TheWatcher01
 * @date 08-11-2024
 * @description Type definitions for authentication system
 */

export interface User {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    profile?: UserProfile;
    githubId?: string;
  }
  
  export interface UserProfile {
    name?: string;
    avatarUrl?: string;
    publicRepos?: number;
    followers?: number;
    following?: number;
    createdAt?: string;
    bio?: string;
  }
  
  export type UserRole = 'admin' | 'user' | 'instructor' | 'student';
  
  export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    error: string | null;
  }
  
  export interface AuthContextType extends AuthState {
    login: (accessToken: string, refreshToken?: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshAuth: () => Promise<void>;
    updateUser: (userData: Partial<User>) => void;
  }
  
  export interface AuthResponse {
    data: {
      accessToken: string;
      refreshToken?: string;
      user: User;
    };
    message: string;
  }
  
  export interface AuthError {
    message: string;
    code?: string;
    status?: number;
  }
  
  export const AUTH_EVENTS = {
    LOGIN_SUCCESS: 'auth:login:success',
    LOGIN_ERROR: 'auth:login:error',
    LOGOUT: 'auth:logout',
    SESSION_EXPIRED: 'auth:session:expired',
    TOKEN_REFRESHED: 'auth:token:refreshed',
    PROFILE_UPDATED: 'auth:profile:updated'
  } as const;
  
  export type AuthEventType = typeof AUTH_EVENTS[keyof typeof AUTH_EVENTS];

// File path: frontend/src/constants/auth.ts

export const AUTH_EVENTS = {
    LOGIN_SUCCESS: 'auth:login:success',
    LOGIN_ERROR: 'auth:login:error',
    LOGOUT: 'auth:logout',
    SESSION_EXPIRED: 'auth:session:expired',
    TOKEN_REFRESHED: 'auth:token:refreshed',
    PROFILE_UPDATED: 'auth:profile:updated'
  } as const;
  
  export const AUTH_ERROR_CODES = {
    TOKEN_EXPIRED: 'token_expired',
    INVALID_TOKEN: 'invalid_token',
    REFRESH_FAILED: 'refresh_failed',
    NETWORK_ERROR: 'network_error',
    UNKNOWN_ERROR: 'unknown_error'
  } as const;
  
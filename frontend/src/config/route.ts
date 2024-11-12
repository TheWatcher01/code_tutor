/**
 * @file routes.ts
 * @description Centralized route configuration
 * @author TheWatcher
 * @date 2024-11-12
 */

export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    AUTH: {
      GITHUB_CALLBACK: '/auth/github/callback',
      CALLBACK: '/auth/callback'
    },
    PLAYGROUND: '/playground'
  } as const;
  
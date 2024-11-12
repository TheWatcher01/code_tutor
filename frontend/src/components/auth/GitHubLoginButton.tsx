/**
 * @file GitHubLoginButton.tsx
 * @description GitHub OAuth login button with enhanced state management
 * @author TheWatcher01
 * @date 2024-11-12
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import GitHubLogo from "@/components/icons/GitHubLogo";
import frontendLogger from '@/config/frontendLogger';

// Constants
const AUTH_STORAGE_KEYS = {
  INTENDED_PATH: 'intendedPath',
  AUTH_STATE: 'authState'
} as const;

const GitHubLoginButton: React.FC = () => {
  const navigate = useNavigate();

  const handleGitHubLogin = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    const startTime = performance.now();

    try {
      // Generate and store auth state
      const authState = crypto.randomUUID();

      // Store current path and state
      sessionStorage.setItem(AUTH_STORAGE_KEYS.INTENDED_PATH, window.location.pathname);
      sessionStorage.setItem(AUTH_STORAGE_KEYS.AUTH_STATE, authState);

      const githubAuthUrl = new URL('http://localhost:5001/api/auth/github');
      githubAuthUrl.searchParams.append('state', authState);
      githubAuthUrl.searchParams.append('redirect_uri', `${window.location.origin}/auth/callback`);

      frontendLogger.info('Initiating GitHub login', {
        from: window.location.pathname,
        state: authState,
        duration: performance.now() - startTime
      });

      window.location.href = githubAuthUrl.toString();
    } catch (error) {
      frontendLogger.error('GitHub login initialization failed:', {
        error,
        duration: performance.now() - startTime
      });

      navigate('/login', {
        state: {
          error: 'Failed to initialize GitHub login',
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [navigate]);

  return (
    <Button
      onClick={handleGitHubLogin}
      variant="default"
      className="w-full bg-black text-white hover:bg-gray-800 focus-visible:ring-2 
                 focus-visible:ring-offset-2 transition-colors duration-200"
      data-testid="github-login-button"
    >
      <GitHubLogo className="mr-2 h-5 w-5" aria-hidden="true" />
      <span>Login with GitHub</span>
    </Button>
  );
};

export default GitHubLoginButton;

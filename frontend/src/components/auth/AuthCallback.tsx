/**
 * @file AuthCallback.tsx
 * @description Handle GitHub OAuth callback and token management
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import frontendLogger from '@/config/frontendLogger';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AxiosError } from 'axios';

// Constants
const ROUTES = {
  LOGIN: '/login',
  PLAYGROUND: '/playground'
} as const;

// Types
interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<AuthError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const startTime = performance.now();

      try {
        frontendLogger.debug('Starting auth callback process', {
          params: searchParams.toString(),
          pathname: location.pathname
        });

        // Check for access token first (redirect from backend)
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        // Check for GitHub callback parameters
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (accessToken) {
          frontendLogger.debug('Processing backend redirect with tokens');

          // Login using AuthContext
          await login(accessToken, refreshToken || undefined);

          const duration = Math.round(performance.now() - startTime);
          frontendLogger.info('Authentication successful', { duration: `${duration}ms` });

          // Navigate to playground
          navigate(ROUTES.PLAYGROUND, { replace: true });
        } else if (code && state) {
          frontendLogger.debug('Processing GitHub callback', {
            hasCode: true,
            hasState: true
          });

          // The backend will handle token exchange and redirect back here
          // with access_token in the URL
          frontendLogger.debug('Waiting for backend token exchange...');
        } else {
          throw new Error('Invalid callback parameters');
        }

      } catch (error) {
        const thrownError = error as Error | AxiosError;
        const duration = Math.round(performance.now() - startTime);

        frontendLogger.error('Auth callback failed:', {
          error: thrownError,
          duration: `${duration}ms`,
          stack: thrownError.stack
        });

        setError({
          message: thrownError.message || 'Authentication failed',
          code: 'code' in thrownError ? thrownError.code : 'AUTH_ERROR',
          status: (thrownError as AxiosError).response?.status
        });

        // Navigate to login on error
        setTimeout(() => {
          navigate(ROUTES.LOGIN, {
            replace: true,
            state: { error: thrownError.message }
          });
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [navigate, searchParams, location, login]);

  if (error) {
    frontendLogger.debug('Rendering error state', { error });
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Authentication Failed</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error.message}</p>
            {error.status && <p className="text-sm">Status: {error.status}</p>}
            <p className="text-sm animate-pulse">Redirecting to login page...</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 p-6 rounded-lg shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <div>
          <h2 className="text-lg font-semibold">
            {isLoading ? 'Processing authentication...' : 'Setting up your session...'}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {isLoading ? 'Please wait while we complete the process' : 'Almost there...'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;

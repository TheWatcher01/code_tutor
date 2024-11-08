/**
 * @file AuthCallback.tsx
 * @author TheWatcher01
 * @date 07-11-2024
 * @description Enhanced callback handler for authentication with strict typing
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import frontendLogger from '@/config/frontendLogger';
import axiosInstance from '@/services/axiosConfig';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AxiosError } from 'axios';

interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  profile?: {
    name?: string;
    avatarUrl?: string;
    [key: string]: unknown;
  };
}

interface ApiResponse<T> {
  user: T;
  message?: string;
  status: number;
}

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<AuthError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const startTime = Date.now();

      try {
        frontendLogger.debug('Starting auth callback processing', {
          hasSearchParams: searchParams.toString(),
          referer: document.referrer,
          timestamp: new Date().toISOString()
        });

        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        if (!accessToken) {
          throw new Error('No access token received');
        }

        // Log token presence (but not the tokens themselves)
        frontendLogger.debug('Tokens received:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          timestamp: new Date().toISOString()
        });

        // Store tokens securely
        localStorage.setItem('token', accessToken);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        // Configure axios
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        try {
          // Fetch user profile with typed response
          const response = await axiosInstance.get<ApiResponse<UserProfile>>('/api/users/profile');
          const userProfile = response.data.user;

          // Validate user profile data
          if (!userProfile?.id || !userProfile?.username) {
            throw new Error('Invalid user profile data received');
          }

          // Store minimal user data
          const safeUserData = {
            id: userProfile.id,
            username: userProfile.username,
            role: userProfile.role
          };

          localStorage.setItem('user', JSON.stringify(safeUserData));

          frontendLogger.info('Authentication successful', {
            userId: safeUserData.id,
            duration: Date.now() - startTime
          });

          navigate('/playground', { replace: true });
        } catch (profileError) {
          const error = profileError as AxiosError<{ message: string }>;
          frontendLogger.error('Profile fetch failed:', {
            error: error.message,
            status: error.response?.status,
            data: error.response?.data
          });
          throw new Error('Failed to fetch user profile');
        }
      } catch (error) {
        const thrownError = error as Error | AxiosError;
        const errorMessage = 'message' in thrownError ? thrownError.message : 'Authentication failed';

        frontendLogger.error('Auth callback error:', {
          message: errorMessage,
          stack: thrownError.stack,
          duration: Date.now() - startTime
        });

        setError({
          message: errorMessage,
          code: 'code' in thrownError ? thrownError.code : 'AUTH_ERROR',
          status: (thrownError as AxiosError).response?.status
        });

        // Delayed navigation on error
        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: { error: errorMessage }
          });
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [navigate, searchParams, location]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Authentication Failed</AlertTitle>
          <AlertDescription>
            {error.message}
            {error.status && <div className="text-sm">Status: {error.status}</div>}
            <div className="mt-2 text-sm">Redirecting to login page...</div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        {isLoading && <Loader2 className="h-8 w-8 animate-spin mx-auto" />}
        <div>
          <h2 className="text-lg font-semibold">
            {isLoading ? 'Completing authentication...' : 'Setting up your session...'}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {isLoading ? 'Please wait while we verify your credentials' : 'Almost there...'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;

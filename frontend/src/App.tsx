/**
 * @file App.tsx
 * @description Main application component with improved auth flow
 */

import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams
} from 'react-router-dom';
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Playground from '@/pages/Playground';
import AuthCallback from '@/components/auth/AuthCallback';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/contexts/auth/AuthProvider';
import { useAuth } from './hooks/useAuth';
import frontendLogger from '@/config/frontendLogger';
import { TokenService } from '@/services/axiosConfig';
import { ROUTES } from '@/config/route';

// Token Handler Component
const TokenHandler: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  React.useEffect(() => {
    const handleToken = async () => {
      try {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        if (!accessToken) {
          throw new Error('No access token found');
        }

        frontendLogger.debug('Processing tokens', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        });

        await login(accessToken, refreshToken || undefined);
        navigate(ROUTES.PLAYGROUND, { replace: true });
      } catch (error) {
        frontendLogger.error('Token processing failed:', error);
        navigate(ROUTES.LOGIN, { replace: true });
      }
    };

    handleToken();
  }, [searchParams, login, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  );
};

// Route Logger Component
const RouteLogger: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    frontendLogger.debug('Route changed:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      timestamp: new Date().toISOString(),
      referrer: document.referrer
    });
  }, [location]);

  return null;
};

// Protected Route Component
interface PrivateRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  requireAuth = true
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const hasToken = TokenService.getAccessToken();

  React.useEffect(() => {
    frontendLogger.debug('PrivateRoute state:', {
      isAuthenticated,
      isLoading,
      hasToken: !!hasToken,
      path: location.pathname,
      requireAuth
    });
  }, [isAuthenticated, isLoading, hasToken, location.pathname, requireAuth]);

  // Check for token in URL
  React.useEffect(() => {
    const accessToken = searchParams.get('access_token');
    if (accessToken && !isAuthenticated) {
      frontendLogger.debug('Found token in URL, redirecting to handler');
      navigate('/auth/token' + location.search, { replace: true });
    }
  }, [searchParams, isAuthenticated, navigate, location.search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    frontendLogger.warn('Unauthorized access attempt:', {
      path: location.pathname,
      isAuthenticated,
      hasToken: !!hasToken
    });

    sessionStorage.setItem('redirectPath', location.pathname);
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (!requireAuth && isAuthenticated) {
    const redirectPath = sessionStorage.getItem('redirectPath') || ROUTES.PLAYGROUND;
    sessionStorage.removeItem('redirectPath');
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

// NotFound Component
const NotFound: React.FC = () => {
  const location = useLocation();
  React.useEffect(() => {
    frontendLogger.warn('404 - Page not found:', {
      path: location.pathname,
      search: location.search,
      referrer: document.referrer
    });
  }, [location]);

  return <Navigate to={ROUTES.HOME} replace />;
};

// Application Routes
const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path={ROUTES.HOME} element={<Home />} />

      {/* Auth routes */}
      <Route path={ROUTES.LOGIN} element={
        <PrivateRoute requireAuth={false}>
          <Login />
        </PrivateRoute>
      } />
      <Route path={ROUTES.REGISTER} element={
        <PrivateRoute requireAuth={false}>
          <Register />
        </PrivateRoute>
      } />

      {/* Auth handling routes */}
      <Route path="/auth/token" element={<TokenHandler />} />
      <Route path={ROUTES.AUTH.GITHUB_CALLBACK} element={<AuthCallback />} />
      <Route path={ROUTES.AUTH.CALLBACK} element={<AuthCallback />} />

      {/* Protected routes */}
      <Route path={ROUTES.PLAYGROUND} element={
        <PrivateRoute>
          <Playground />
        </PrivateRoute>
      } />

      {/* Fallback route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Root App Component
const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="shadcn-ui-theme">
      <TooltipProvider>
        <Router>
          <AuthProvider>
            <RouteLogger />
            <AppContent />
          </AuthProvider>
        </Router>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;

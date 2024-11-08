/**
 * @file App.tsx
 * @author TheWatcher01
 * @date 2024-11-08
 * @description Main application component with enhanced auth flow
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
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/ThemeProvider';
import frontendLogger from '@/config/frontendLogger';
import { Loader2 } from 'lucide-react';

// AuthCallback component with enhanced logging
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  React.useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    frontendLogger.debug('Auth callback triggered:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      timestamp: new Date().toISOString()
    });

    if (accessToken && refreshToken) {
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      frontendLogger.info('Authentication successful, redirecting to playground');
      navigate('/playground', { replace: true });
    } else {
      frontendLogger.error('Missing tokens in callback');
      navigate('/login', {
        replace: true,
        state: { error: 'Authentication failed' }
      });
    }
  }, [navigate, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <h2 className="text-lg font-semibold">Finalizing authentication...</h2>
        <p className="text-sm text-muted-foreground">Please wait while we redirect you</p>
      </div>
    </div>
  );
};

// Route logger component for debugging
const RouteLogger: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    frontendLogger.debug('Route changed:', {
      pathname: location.pathname,
      search: location.search,
      timestamp: new Date().toISOString()
    });
  }, [location]);

  return null;
};

// Enhanced PrivateRoute with loading state
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();

  React.useEffect(() => {
    frontendLogger.debug('PrivateRoute evaluation:', {
      hasToken: !!token,
      path: location.pathname,
      timestamp: new Date().toISOString()
    });
  }, [token, location]);

  if (!token) {
    frontendLogger.warn('Unauthorized access attempt:', {
      path: location.pathname,
      timestamp: new Date().toISOString()
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// NotFound component with logging
const NotFound: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    frontendLogger.warn('404 - Page not found:', {
      path: location.pathname,
      search: location.search,
      referrer: document.referrer
    });
  }, [location]);

  return <Navigate to="/" replace />;
};

const App: React.FC = () => {
  React.useEffect(() => {
    frontendLogger.info('App initialized', {
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE,
      version: import.meta.env.VITE_APP_VERSION
    });
  }, []);

  return (
    <ThemeProvider defaultTheme="system" storageKey="shadcn-ui-theme">
      <TooltipProvider>
        <Router>
          <RouteLogger />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth-callback" element={<AuthCallback />} />
            <Route
              path="/playground"
              element={
                <PrivateRoute>
                  <Playground />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;

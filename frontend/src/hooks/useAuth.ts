// File path: frontend/src/hooks/useAuth.ts

import { useContext } from 'react';
import { AuthContext } from '@/contexts/auth/AuthContext';
import { AuthContextType } from '@/types/auth';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

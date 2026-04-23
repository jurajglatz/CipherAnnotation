/**
 * useAuth hook
 * Provides access to authentication context
 */

import { useContext } from 'react';
import { AuthContext, AuthContextType } from '../context/AuthContext';

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default useAuth;

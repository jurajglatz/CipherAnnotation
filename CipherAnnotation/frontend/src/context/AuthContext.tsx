/**
 * Auth Context
 * Manages authentication state and provides auth functions to the app
 */

import React, { createContext, useCallback, useEffect, useState } from 'react';
import authService from '../services/authService';
import { User, LoginRequest, RegisterRequest } from '../types';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// Create context with undefined default
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from storage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = authService.getToken();
        const storedUser = authService.getStoredUser();

        if (storedToken) {
          setToken(storedToken);

          // Validate token by fetching current user
          try {
            const currentUser = await authService.getMe();
            setUser(currentUser);
            authService.saveUser(currentUser);
          } catch (err) {
            // Token is invalid, clear storage
            authService.logout();
            setToken(null);
            setUser(null);
          }
        } else if (storedUser) {
          // Have user but no token, clear user
          setUser(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login handler
  const login = useCallback(async (data: LoginRequest) => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await authService.login(data);

      authService.saveToken(response.token);
      authService.saveUser(response.user);

      setToken(response.token);
      setUser(response.user);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register handler
  const register = useCallback(async (data: RegisterRequest) => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await authService.register(data);

      authService.saveToken(response.token);
      authService.saveUser(response.user);

      setToken(response.token);
      setUser(response.user);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Google login handler
  const googleLogin = useCallback(async (idToken: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await authService.googleLogin(idToken);

      authService.saveToken(response.token);
      authService.saveUser(response.user);

      setToken(response.token);
      setUser(response.user);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Google login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    error,
    login,
    register,
    googleLogin,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

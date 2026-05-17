/**
 * Auth Context
 * Manages authentication state and provides auth functions to the app.
 */

import React, { createContext, useCallback, useEffect, useState } from 'react';
import authService from '../services/authService';
import { User, LoginRequest, RegisterRequest } from '../types';

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const storedToken = authService.getAccessToken();
        if (!storedToken) return;

        setAccessToken(storedToken);
        try {
          const currentUser = await authService.getMe();
          setUser(currentUser);
          authService.saveUser(currentUser);
        } catch {
          authService.clear();
          setAccessToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const handleAuthResponse = (response: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    user: User;
  }) => {
    authService.saveAuth(response);
    setAccessToken(response.accessToken);
    setUser(response.user);
  };

  const login = useCallback(async (data: LoginRequest) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authService.login(data);
      handleAuthResponse(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authService.register(data);
      handleAuthResponse(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const googleLogin = useCallback(async (idToken: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authService.googleLogin(idToken);
      handleAuthResponse(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google login failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setAccessToken(null);
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextType = {
    user,
    accessToken,
    isAuthenticated: !!accessToken && !!user,
    isLoading,
    error,
    login,
    register,
    googleLogin,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

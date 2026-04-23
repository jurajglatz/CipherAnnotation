/**
 * Authentication service
 * Handles login, registration, and user session management
 */

import api from './api';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';

class AuthService {
  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  }

  /**
   * Login with Google ID token
   */
  async googleLogin(idToken: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/google-login', {
      idToken,
    });
    return response.data;
  }

  /**
   * Get current authenticated user
   */
  async getMe(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  }

  /**
   * Logout (clears local storage)
   */
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  /**
   * Save auth token to storage
   */
  saveToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  /**
   * Get auth token from storage
   */
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Save user to storage
   */
  saveUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * Get user from storage
   */
  getStoredUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export default new AuthService();

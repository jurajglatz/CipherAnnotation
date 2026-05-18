/**
 * LoginPage Component
 * User login page with email/password form and Google login option
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Key, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '@/hooks';
import { LoginRequest } from '@/types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, googleLogin, isLoading, error, clearError, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/documents');
    }
  }, [isAuthenticated, navigate]);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setFormError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Please enter a valid email address');
      return false;
    }
    if (!password) {
      setFormError('Password is required');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const loginData: LoginRequest = {
        email: email.trim(),
        password,
      };
      await login(loginData);
      toast.success('Login successful!');
      navigate('/documents');
    } catch (err) {
      const errorMsg = error || 'Login failed. Please try again.';
      toast.error(errorMsg);
    }
  };

  const handleGoogleSuccess = async (cred: CredentialResponse) => {
    if (!cred.credential) {
      toast.error('Google did not return a credential.');
      return;
    }
    try {
      await googleLogin(cred.credential);
      toast.success('Login successful!');
      navigate('/documents');
    } catch {
      toast.error(error || 'Google login failed.');
    }
  };

  return (
    <div className="relative min-h-screen bg-parchment text-ink-900 overflow-hidden flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 cipher-symbols-bg opacity-[0.18] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-parchment-100/50 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo / Back to home */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group mb-6">
            <div className="w-11 h-11 rounded-full bg-ink-900 text-parchment-50 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Key className="w-5 h-5" />
            </div>
            <span className="font-serif text-2xl font-semibold text-ink-900 tracking-tight">
              CipherAnnotation
            </span>
          </Link>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink-900 leading-tight">
            Welcome <em className="italic font-normal text-sepia-700">back</em>
          </h1>
          <p className="mt-3 text-ink-900/70">Sign in to continue your work</p>
        </div>

        {/* Card */}
        <div className="bg-parchment-50/80 backdrop-blur-sm border border-sepia-600/20 rounded-lg shadow-lg shadow-ink-900/5 p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            {(formError || error) && (
              <div className="flex items-start gap-3 p-3 bg-cipher-red/5 border border-cipher-red/30 rounded-md">
                <AlertCircle className="w-5 h-5 text-cipher-red flex-shrink-0 mt-0.5" />
                <p className="text-sm text-cipher-red">{formError || error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sepia-600" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError('');
                    if (error) clearError();
                  }}
                  disabled={isLoading}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/50 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 disabled:opacity-50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sepia-600" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formError) setFormError('');
                    if (error) clearError();
                  }}
                  disabled={isLoading}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/50 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 disabled:opacity-50 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-ink-900 hover:bg-primary-700 disabled:opacity-60 disabled:hover:bg-ink-900 text-parchment-50 font-semibold rounded-md shadow-lg shadow-ink-900/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-sepia-600/20" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-parchment-50 text-sepia-700 font-medium tracking-wider uppercase">
                Or continue with
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google login failed.')}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
            />
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-ink-900/70">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-sepia-700 hover:text-ink-900 font-semibold transition-colors underline-offset-4 hover:underline"
          >
            Create one here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

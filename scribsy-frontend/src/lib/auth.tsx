'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, LoginRequest, RegisterRequest } from '@/types';
import { apiClient } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  handleAuthFailure: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Function to handle authentication failures
  const handleAuthFailure = useCallback(() => {
    apiClient.clearToken();
    setUser(null);
    // Redirect to access denied page for expired sessions
    if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
      router.push('/access-denied');
    }
  }, [router]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser);
      } catch {
        // User is not authenticated or token is invalid
        handleAuthFailure();
        console.log('User not authenticated');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Set up the auth failure callback
    apiClient.setAuthFailureCallback(handleAuthFailure);
  }, [handleAuthFailure]);

  const login = async (credentials: LoginRequest) => {
    try {
      await apiClient.login(credentials);
      const currentUser = await apiClient.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      // Preserve the specific error message from the backend
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      await apiClient.register(userData);
      // Auto-login after registration
      await login(userData);
    } catch (error) {
      // Preserve the specific error message from the backend
      throw error;
    }
  };

  const logout = () => {
    apiClient.clearToken();
    // Clear server-side cookies
    apiClient.logoutServer().catch(() => {});
    setUser(null);
    // Redirect to landing page after logout
    router.push('/');
  };

  // Set up periodic auth check and sliding refresh to handle expired tokens
  useEffect(() => {
    if (!user) return;

    const checkAuthStatus = async () => {
      try {
        // Try to refresh token to extend session while the app is active
        try {
          await apiClient.refreshSession();
        } catch {
          // Fallback: try /me; if still 401, try using stored token header
          try {
            await apiClient.getCurrentUser();
          } catch {
            // no-op; handleAuthFailure will run below
          }
        }
      } catch {
        // Token is invalid, handle auth failure
        handleAuthFailure();
      }
    };

    // Refresh every 5 minutes to maintain session while active
    const interval = setInterval(checkAuthStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user, handleAuthFailure]);

  return (
    <AuthContext.Provider value={{ user, loading, isLoading: loading, login, register, logout, handleAuthFailure }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
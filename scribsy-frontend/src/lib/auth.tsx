'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LoginRequest, RegisterRequest } from '@/types';
import { apiClient } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
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
  const handleAuthFailure = () => {
    apiClient.clearToken();
    setUser(null);
    // Redirect to access denied page for expired sessions
    if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
      router.push('/access-denied');
    }
  };

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
  }, []);

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
    setUser(null);
    // Redirect to landing page after logout
    router.push('/');
  };

  // Set up periodic auth check to handle expired tokens
  useEffect(() => {
    if (!user) return;

    const checkAuthStatus = async () => {
      try {
        await apiClient.getCurrentUser();
      } catch {
        // Token is invalid, handle auth failure
        handleAuthFailure();
      }
    };

    // Check auth status every 5 minutes
    const interval = setInterval(checkAuthStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, handleAuthFailure }}>
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
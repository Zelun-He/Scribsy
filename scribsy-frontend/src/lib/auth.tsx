'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { User, LoginRequest, RegisterRequest } from '@/types';
import { apiClient } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoading: boolean;
  login: (_credentials: LoginRequest) => Promise<void>;
  register: (_userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  handleAuthFailure: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function LegacyAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleAuthFailure = useCallback(() => {
    apiClient.clearToken();
    setUser(null);
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
        // User is not authenticated or token is invalid.
        handleAuthFailure();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    apiClient.setAuthFailureCallback(handleAuthFailure);
  }, [handleAuthFailure]);

  const login = async (credentials: LoginRequest) => {
    await apiClient.login(credentials);
    const currentUser = await apiClient.getCurrentUser();
    setUser(currentUser);
  };

  const register = async (userData: RegisterRequest) => {
    await apiClient.register(userData);
    await login(userData);
  };

  const logout = async () => {
    apiClient.clearToken();
    apiClient.logoutServer().catch(() => {});
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isLoading: loading, login, register, logout, handleAuthFailure }}>
      {children}
    </AuthContext.Provider>
  );
}

function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();

  const handleAuthFailure = useCallback(() => {
    apiClient.clearToken();
    setUser(null);
    if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
      router.push('/access-denied');
    }
  }, [router]);

  useEffect(() => {
    const initAuth = async () => {
      if (!isLoaded) return;
      if (!isSignedIn) {
        apiClient.clearToken();
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const token = await getToken();
        if (!token) throw new Error('No Clerk token available');
        apiClient.setToken(token);
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser);
      } catch {
        handleAuthFailure();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    apiClient.setAuthFailureCallback(handleAuthFailure);
  }, [getToken, handleAuthFailure, isLoaded, isSignedIn]);

  const login = async () => {
    router.push('/login');
  };

  const register = async () => {
    router.push('/register');
  };

  const logout = async () => {
    apiClient.clearToken();
    await signOut({ redirectUrl: '/' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isLoading: loading, login, register, logout, handleAuthFailure }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children, enableClerk = false }: { children: React.ReactNode; enableClerk?: boolean }) {
  if (!enableClerk) {
    return <LegacyAuthProvider>{children}</LegacyAuthProvider>;
  }
  return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
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
      router.push('/login');
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
  const { user: clerkUser } = useUser();

  const handleAuthFailure = useCallback(() => {
    apiClient.clearToken();
    setUser(null);
    if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
      router.push('/login');
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
        // Basic login flow:
        // 1) get Clerk token, 2) load API user, 3) fallback to clerk-login exchange, 4) retry briefly.
        let currentUser: User | null = null;

        for (let attempt = 0; attempt < 5; attempt++) {
          const token = await getToken();
          if (!token) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            continue;
          }

          apiClient.setToken(token);

          try {
            currentUser = await apiClient.getCurrentUser({ suppressAuthFailure: true });
            break;
          } catch {
            try {
              await apiClient.loginWithClerk(
                token,
                {
                  email: clerkUser?.primaryEmailAddress?.emailAddress ?? undefined,
                  username: clerkUser?.username ?? undefined,
                },
                { suppressAuthFailure: true }
              );
              currentUser = await apiClient.getCurrentUser({ suppressAuthFailure: true });
              break;
            } catch {
              // Backend may still be waiting for session/token propagation.
              await new Promise((resolve) => setTimeout(resolve, 400));
            }
          }
        }

        if (!currentUser) {
          throw new Error('Login failed. Unable to establish authenticated session');
        }

        setUser(currentUser);
      } catch {
        handleAuthFailure();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    apiClient.setAuthFailureCallback(handleAuthFailure);
  }, [clerkUser, getToken, handleAuthFailure, isLoaded, isSignedIn]);

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

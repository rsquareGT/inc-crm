
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Standard import for App Router
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>; // Exposed to allow manual refresh if needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        setUser(null);
        // Don't redirect here, let middleware or page components handle it
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.success && data.user) {
        setUser(data.user);
        setIsLoading(false);
        return true;
      } else {
        setUser(null);
        setIsLoading(false);
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      setUser(null);
      setIsLoading(false);
      console.error('Login error in context:', error);
      throw error; // Re-throw for the form to handle
    }
  };

  const logout = async () => {
    setUser(null); // Optimistically update UI
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout API call failed:', error);
      // User is already cleared client-side, so this is mostly for server session
    } finally {
      router.push('/login'); // Redirect to login after logout
    }
  };
  
  // Re-fetch user on window focus to catch session changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUser();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUser]);


  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, fetchUser }}>
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

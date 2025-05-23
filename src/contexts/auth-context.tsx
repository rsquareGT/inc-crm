
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
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // True until initial user check is done
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    // Don't set isLoading to true here for every call, only for initial load.
    // Or if it's a deliberate refresh action.
    // For now, initial setIsLoading(true) above handles the first load.
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    } finally {
      // This finally block ensures isLoading is set to false after the initial fetch attempt,
      // regardless of success or failure.
      if (isLoading) setIsLoading(false);
    }
  }, [isLoading]); // Include isLoading to prevent re-setting it to false if already false.

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    // This login function is responsible for the API call and then updating the context's user.
    // The form itself will handle its own "submitting" state.
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.success && data.user) {
        setUser(data.user); // Directly set the user state from API response
        // If the context was still in its initial loading phase, mark it as loaded.
        if (isLoading) {
          setIsLoading(false);
        }
        return true;
      } else {
        setUser(null); // Clear user on failed login attempt
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      setUser(null); // Ensure user is cleared on any error
      console.error('Login error in context:', error);
      throw error; // Re-throw for the form to handle and display message
    }
  };

  const logout = async () => {
    setUser(null); // Optimistically update UI
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      router.push('/login'); // Redirect to login after logout
    }
  };
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUser(); // Re-fetch user on tab focus to catch external session changes
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

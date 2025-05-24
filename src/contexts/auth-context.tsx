
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Standard import
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
  const [isLoading, setIsLoading] = useState(true); // True initially until first fetchUser completes
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    // Don't set isLoading to true here if it's a re-fetch, only for initial load
    // setIsLoading(true) // This might cause flicker if called too often. Initial loading handled by useEffect.
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('AuthContext: Failed to fetch user:', error);
      setUser(null);
    } finally {
      setIsLoading(false); // Always set to false after attempt
    }
  }, []);

  useEffect(() => {
    setIsLoading(true); // Set loading true for the very first fetchUser call
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true); // Indicate loading during login attempt
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Cookie is set by the API. Now re-fetch user state based on the new cookie.
        await fetchUser(); // This will update user and isAuthenticated state
        // Check if user state was successfully updated by fetchUser
        const updatedUser = user; // Re-read after fetchUser
        if (updatedUser || (await (await fetch('/api/auth/me')).json()).user) { // Check if fetchUser populated context, or double check /me
           setIsLoading(false);
           return true;
        } else {
           // This case might indicate a cookie issue or /me not returning user right after login
           console.warn("AuthContext: Login API succeeded but fetchUser didn't set user immediately.");
           setUser(null); // Ensure user is null if fetchUser didn't populate it
           setIsLoading(false);
           return false;
        }
      } else {
        setUser(null);
        setIsLoading(false);
        throw new Error(data.error || 'Login API call failed');
      }
    } catch (error) {
      setUser(null);
      setIsLoading(false);
      console.error('AuthContext: Login error:', error);
      throw error; 
    }
  };

  const logout = async () => {
    setUser(null); 
    // No setIsLoading(true) here to prevent redirect loop if logout page itself uses AppPageShell
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('AuthContext: Logout API call failed:', error);
    } finally {
      router.push('/login');
      // Ensure loading is false after logout navigation attempt
      // This is important so AppPageShell doesn't get stuck in loading if logout page uses it
      setIsLoading(false); 
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-fetch user data when tab becomes visible to sync session state
        // Only set loading if it's not already loading from another operation
        if(!isLoading) { 
            // setIsLoading(true); // Optional: only set loading if you want spinner on tab focus
        }
        fetchUser();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUser, isLoading]); // Added isLoading to deps

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

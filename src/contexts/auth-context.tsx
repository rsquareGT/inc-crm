
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchUser: (isInitialLoad?: boolean) => Promise<void>; // Added isInitialLoad optional param
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true for initial load
  const router = useRouter();

  const fetchUser = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      console.log('AuthContext: Initial fetchUser called.');
      // No need to setIsLoading(true) here as it's already true initially
    } else {
      console.log('AuthContext: fetchUser called (revalidation).');
      // For revalidations, you might want a different loading indicator or none
    }

    try {
      const response = await fetch('/api/auth/me');
      console.log(`AuthContext: /api/auth/me response status: ${response.status}`);
      if (response.ok) {
        const userData = await response.json();
        if (userData.success && userData.user) {
          setUser(userData.user);
          console.log('AuthContext: User set from /api/auth/me:', userData.user.email);
        } else {
          setUser(null);
          console.log('AuthContext: /api/auth/me success but no user data or success flag false.');
        }
      } else {
        setUser(null);
        console.log('AuthContext: /api/auth/me call failed or returned non-OK status.');
      }
    } catch (error) {
      console.error('AuthContext: Failed to fetch user from /api/auth/me:', error);
      setUser(null);
    } finally {
      // Only set isLoading to false if it was true for the initial load
      // For revalidations, isLoading might not have been set to true by this specific fetchUser call.
      if (isLoading) { // Check current isLoading state
        setIsLoading(false);
        console.log('AuthContext: fetchUser finished, isLoading set to false.');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]); // Keep isLoading here for the specific logic in finally, or remove if not strictly needed for revalidations.
                  // Better: remove isLoading from deps, and control isLoading set to true only at the start of initial load.

  // Corrected useEffect for initial load
  useEffect(() => {
    setIsLoading(true); // Explicitly set loading true for the very first fetch
    fetchUser(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount


  const login = async (email: string, password: string): Promise<boolean> => {
    console.log(`AuthContext: login called for ${email}`);
    // Don't set context isLoading to true here, login form can manage its own button loading state
    try {
      console.log('AuthContext: Calling /api/auth/login...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      console.log(`AuthContext: /api/auth/login response status: ${response.status}`, data);

      if (response.ok && data.success && data.user) {
        console.log('AuthContext: /api/auth/login successful. User data received. Setting user and fetching to verify session.');
        setUser(data.user); // Set user directly from login response
        // Optionally, call fetchUser() if you want to re-verify from /me, but not strictly necessary if login returns user
        // await fetchUser(); 
        // For faster UI update, we trust the login response. /me will be called on subsequent navigations/reloads.
        if (isLoading) setIsLoading(false); // Ensure loading is false if it was a very quick first login
        return true;
      } else {
        console.warn('AuthContext: /api/auth/login failed or data.success was false or no user data.');
        setUser(null);
        if (isLoading) setIsLoading(false);
        throw new Error(data.error || 'Login API call failed or did not return user data.');
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      setUser(null);
      if (isLoading) setIsLoading(false);
      throw error; // Re-throw for the form to handle
    }
  };

  const logout = async () => {
    console.log('AuthContext: logout called.');
    setUser(null);
    setIsLoading(true); 
    try {
      console.log('AuthContext: Calling /api/auth/logout...');
      await fetch('/api/auth/logout', { method: 'POST' });
      console.log('AuthContext: /api/auth/logout call completed.');
    } catch (error) {
      console.error('AuthContext: Logout API call failed:', error);
    } finally {
      console.log('AuthContext: Pushing to /login and setting isLoading to false.');
      router.push('/login');
      // isLoading will be set to true again by the mount effect of AuthProvider on login page
      // but good to ensure it is false if logout was very quick.
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoading) { // Only fetch if not already loading
        console.log('AuthContext: Tab became visible, re-fetching user.');
        fetchUser(); // Revalidate session
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUser, isLoading]); // Add isLoading to dependency

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

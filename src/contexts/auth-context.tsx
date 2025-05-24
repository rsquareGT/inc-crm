
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      console.log('AuthContext: Initial fetchUser called.');
      setIsLoading(true);
    } else {
      console.log('AuthContext: fetchUser called (revalidation).');
      // Optionally, set a different loading state for revalidations if needed
      // setIsLoading(true); // Or a more subtle loading indicator
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
      if (isInitialLoad || isLoading) { // Only change isLoading if it was true
         setIsLoading(false);
         console.log('AuthContext: fetchUser finished, isLoading set to false.');
      }
    }
  }, [isLoading]); // Added isLoading to ensure it only sets it false if it was true

  useEffect(() => {
    fetchUser(true); // Pass true for initial load
  }, [fetchUser]);


  const login = async (email: string, password: string): Promise<boolean> => {
    console.log(`AuthContext: login called for ${email}`);
    setIsLoading(true); // Indicate loading during login attempt
    try {
      console.log('AuthContext: Calling /api/auth/login...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      console.log(`AuthContext: /api/auth/login response status: ${response.status}`, data);

      if (response.ok && data.success) {
        console.log('AuthContext: /api/auth/login successful. Now calling fetchUser to verify session.');
        await fetchUser(); // This will attempt to set the user based on the new cookie
        
        // Check user state directly after fetchUser has completed
        // Need a way to access the latest state of user, as `user` in this scope might be stale
        // A better way is to rely on the LoginForm's useEffect watching the context's isAuthenticated
        const responseAfterFetchUser = await fetch('/api/auth/me'); // Double check
        if(responseAfterFetchUser.ok && (await responseAfterFetchUser.json()).user){
            console.log('AuthContext: login successful, user session verified by a subsequent /me call.');
            setIsLoading(false);
            return true; // Indicate to LoginForm that login API + session verification was successful
        } else {
            console.warn('AuthContext: /api/auth/login succeeded, but subsequent fetchUser/me check did not confirm session.');
             setUser(null); // Ensure user is null if fetchUser didn't populate it
             setIsLoading(false);
             return false; // Indicate to LoginForm that session verification failed
        }

      } else {
        console.warn('AuthContext: /api/auth/login failed or data.success was false.');
        setUser(null);
        setIsLoading(false);
        throw new Error(data.error || 'Login API call failed');
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      setUser(null);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    console.log('AuthContext: logout called.');
    setUser(null);
    setIsLoading(true); // Prevent rendering protected content briefly
    try {
      console.log('AuthContext: Calling /api/auth/logout...');
      await fetch('/api/auth/logout', { method: 'POST' });
      console.log('AuthContext: /api/auth/logout call completed.');
    } catch (error) {
      console.error('AuthContext: Logout API call failed:', error);
    } finally {
      console.log('AuthContext: Pushing to /login and setting isLoading to false.');
      router.push('/login');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('AuthContext: Tab became visible, re-fetching user.');
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


'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback }
  from 'react';
import { useRouter } from 'next/navigation'; // Reverted to next/navigation
import type { User, Organization } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  organization: Organization | null; // Added organization
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchUser: (isInitialLoad?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null); // Added
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      console.log('AuthContext: Initial fetchUser called.');
      // setIsLoading(true) is handled by the initial state or the mount effect
    } else {
      console.log('AuthContext: fetchUser called (revalidation).');
    }

    try {
      const response = await fetch('/api/auth/me');
      console.log(`AuthContext: /api/auth/me response status: ${response.status}`);
      if (response.ok) {
        const userData = await response.json();
        if (userData.success && userData.user) {
          setUser(userData.user);
          console.log('AuthContext: User set from /api/auth/me:', userData.user.email);
          // Fetch organization details if user is set and has organizationId
          if (userData.user.organizationId) {
            try {
              const orgResponse = await fetch(`/api/organizations/${userData.user.organizationId}`);
              if (orgResponse.ok) {
                const orgData = await orgResponse.json();
                setOrganization(orgData);
                console.log('AuthContext: Organization details fetched:', orgData.name);
              } else {
                console.warn(`AuthContext: Failed to fetch organization details. Status: ${orgResponse.status}`);
                setOrganization(null);
              }
            } catch (orgError) {
              console.error('AuthContext: Error fetching organization details:', orgError);
              setOrganization(null);
            }
          } else {
            setOrganization(null); // No organizationId for user
          }
        } else {
          setUser(null);
          setOrganization(null);
          console.log('AuthContext: /api/auth/me success but no user data or success flag false.');
        }
      } else {
        setUser(null);
        setOrganization(null);
        console.log('AuthContext: /api/auth/me call failed or returned non-OK status.');
      }
    } catch (error) {
      console.error('AuthContext: Failed to fetch user from /api/auth/me:', error);
      setUser(null);
      setOrganization(null);
    } finally {
      if (isInitialLoad) { // Only adjust main loading for initial fetch
        setIsLoading(false);
        console.log('AuthContext: Initial fetchUser sequence finished, isLoading set to false.');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array makes fetchUser stable

  useEffect(() => {
    setIsLoading(true); // Set loading true for the very first fetch sequence
    fetchUser(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const login = async (email: string, password: string): Promise<boolean> => {
    console.log(`AuthContext: login called for ${email}`);
    // Form can manage its own button loading state. Context isLoading is for initial page load.
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
        console.log('AuthContext: /api/auth/login successful. User data received.');
        setUser(data.user); // Set user directly
        if (data.user.organizationId) { // Fetch organization details immediately after login
          try {
            const orgResponse = await fetch(`/api/organizations/${data.user.organizationId}`);
            if (orgResponse.ok) {
              const orgData = await orgResponse.json();
              setOrganization(orgData);
              console.log('AuthContext: Organization details fetched post-login:', orgData.name);
            } else {
              setOrganization(null);
            }
          } catch (orgError) {
            console.error('AuthContext: Error fetching organization details post-login:', orgError);
            setOrganization(null);
          }
        } else {
          setOrganization(null);
        }
        if (isLoading) setIsLoading(false); // Ensure loading is false if it was a very quick first login
        return true;
      } else {
        console.warn('AuthContext: /api/auth/login failed or data.success was false or no user data.');
        setUser(null);
        setOrganization(null);
        if (isLoading) setIsLoading(false);
        throw new Error(data.error || 'Login API call failed or did not return user data.');
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      setUser(null);
      setOrganization(null);
      if (isLoading) setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    console.log('AuthContext: logout called.');
    setUser(null);
    setOrganization(null); // Clear organization on logout
    setIsLoading(true); // To show loading state on login page after redirect
    try {
      console.log('AuthContext: Calling /api/auth/logout...');
      await fetch('/api/auth/logout', { method: 'POST' });
      console.log('AuthContext: /api/auth/logout call completed.');
    } catch (error) {
      console.error('AuthContext: Logout API call failed:', error);
    } finally {
      console.log('AuthContext: Pushing to /login and setting isLoading to false after slight delay.');
      router.push('/login');
      // Delay setting isLoading to false to allow login page to render loading state if needed
      setTimeout(() => setIsLoading(false), 50);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoading && user) { // only re-fetch if user was previously loaded
        console.log('AuthContext: Tab became visible, re-fetching user and organization.');
        fetchUser(); // Revalidate session and organization
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUser, isLoading, user]);

  return (
    <AuthContext.Provider value={{ user, organization, isAuthenticated: !!user, isLoading, login, logout, fetchUser }}>
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

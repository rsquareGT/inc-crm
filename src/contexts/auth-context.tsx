
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback }
  from 'react';
import { useRouter } from 'next/navigation'; // Using standard Next.js router
import type { User, Organization } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>; // Added rememberMe
  logout: () => Promise<void>;
  fetchUser: (isInitialLoad?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async (isInitialLoad = false) => {
    console.log(`AuthContext: fetchUser called. isInitialLoad: ${isInitialLoad}`);
    // setIsLoading(true) should ideally only be set by the initial mount effect or explicitly by login/logout

    try {
      const response = await fetch('/api/auth/me');
      console.log(`AuthContext: /api/auth/me response status: ${response.status}`);
      if (response.ok) {
        const userData = await response.json();
        if (userData.success && userData.user) {
          setUser(userData.user);
          console.log('AuthContext: User set from /api/auth/me:', userData.user.email);
          if (userData.user.organizationId) {
            try {
              const orgResponse = await fetch(`/api/organizations/${userData.user.organizationId}`);
              if (orgResponse.ok) {
                const orgData: Organization = await orgResponse.json();
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
            setOrganization(null);
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
      if (isInitialLoad) {
        setIsLoading(false);
        console.log('AuthContext: fetchUser (initial load) finished, isLoading set to false.');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Keep empty if fetchUser doesn't depend on context's own state like isLoading

  useEffect(() => {
    console.log("AuthContext: AuthProvider mounted. Setting isLoading true and calling initial fetchUser.");
    setIsLoading(true); // Set loading true before initial fetch
    fetchUser(true); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchUser has stable identity due to useCallback with empty deps

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<boolean> => { // Added rememberMe
    console.log(`AuthContext: login called for ${email}, rememberMe: ${rememberMe}`);
    // Do not set context's isLoading to true here, LoginForm manages its own submit state.
    try {
      console.log('AuthContext: Calling /api/auth/login...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }), // Pass rememberMe
      });
      const data = await response.json();
      console.log(`AuthContext: /api/auth/login response status: ${response.status}`, data);

      if (response.ok && data.success && data.user) {
        console.log('AuthContext: /api/auth/login successful. User data received. Directly setting user.');
        setUser(data.user); // Set user immediately from login response
        if (data.user.organizationId) {
          // Fetch organization in background, not blocking login success reporting
          fetch(`/api/organizations/${data.user.organizationId}`)
            .then(async (orgResponse) => {
              if (orgResponse.ok) {
                const orgData = await orgResponse.json();
                setOrganization(orgData);
                console.log('AuthContext: Organization details fetched post-login:', orgData.name);
              } else {
                console.warn(`AuthContext: Failed to fetch organization details post-login. Status: ${orgResponse.status}`);
                setOrganization(null);
              }
            })
            .catch(orgError => {
              console.error('AuthContext: Error fetching organization details post-login:', orgError);
              setOrganization(null);
            });
        } else {
          setOrganization(null);
        }
        // If login happens during initial context loading, ensure isLoading is set to false
        if (isLoading) setIsLoading(false); 
        return true; // Login API succeeded and user data obtained
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
      throw error; // Re-throw to be caught by LoginForm
    }
  };

  const logout = async () => {
    console.log('AuthContext: logout called.');
    setUser(null);
    setOrganization(null);
    // Context isLoading isn't directly relevant for logout action itself,
    // but can be set true if there's an intermediate state before redirect.
    // For simplicity, we immediately update state and then call API.
    try {
      console.log('AuthContext: Calling /api/auth/logout...');
      await fetch('/api/auth/logout', { method: 'POST' });
      console.log('AuthContext: /api/auth/logout call completed.');
    } catch (error) {
      console.error('AuthContext: Logout API call failed:', error);
    } finally {
      console.log('AuthContext: Pushing to /login.');
      router.push('/login'); // Redirect after clearing state and calling API
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !isLoading) { 
        console.log('AuthContext: Tab became visible, re-fetching user and organization.');
        fetchUser(false); 
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUser, user, isLoading]);

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

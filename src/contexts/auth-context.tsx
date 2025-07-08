"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "nextjs-toploader/app";
import type { User, Organization } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchUser: (isInitialLoad?: boolean) => Promise<void>;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isRefreshingRef = useRef(false);
  const activeRefreshPromiseRef = useRef<Promise<Response> | null>(null);

  const logout = useCallback(
    async (doRedirect = true) => {
      console.log("AuthContext: logout called.");
      setUser(null);
      setOrganization(null);
      isRefreshingRef.current = false; // Reset refresh flag on logout
      activeRefreshPromiseRef.current = null;

      try {
        await fetch("/api/auth/logout", { method: "POST" });
        console.log("AuthContext: /api/auth/logout call completed.");
      } catch (error) {
        console.error("AuthContext: Logout API call failed:", error);
      } finally {
        if (doRedirect && router) {
          console.log("AuthContext: Pushing to /login from logout.");
          router.push("/login");
        } else if (doRedirect) {
          console.warn(
            "AuthContext: Router not available in logout, cannot redirect. Forcing page reload for safety."
          );
          // window.location.href = '/login'; // Fallback redirect
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [router]
  );

  const authenticatedFetch = useCallback(
    async (url: string, options?: RequestInit): Promise<Response> => {
      const originalResponse = await fetch(url, options);
      const headers =
        options?.headers instanceof Headers ? options.headers : new Headers(options?.headers || {});

      if (originalResponse.status === 401 && !headers.get("X-No-Refresh")) {
        // Max retries for refresh attempts
        const MAX_REFRESH_RETRIES = 2;
        let retryCount = 0;

        while (retryCount < MAX_REFRESH_RETRIES) {
          if (!isRefreshingRef.current) {
            isRefreshingRef.current = true;
            console.log(
              `AuthContext: API call to ${url} resulted in 401. Attempting token refresh. Attempt ${retryCount + 1}/${MAX_REFRESH_RETRIES}`
            );

            try {
              // Attempt refresh with exponential backoff
              if (retryCount > 0) {
                await new Promise((res) => setTimeout(res, Math.pow(2, retryCount) * 1000));
              }

              const refreshResponse = await fetch("/api/auth/refresh-token", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-No-Refresh": "true",
                },
              });

              if (refreshResponse.ok) {
                console.log("AuthContext: Token refresh successful. Retrying original request.");
                isRefreshingRef.current = false;
                // Retry original request with new token
                return fetch(url, options);
              }

              // If refresh fails, increment retry count and try again if possible
              retryCount++;
              if (retryCount >= MAX_REFRESH_RETRIES) {
                console.warn("AuthContext: Max refresh retries reached. Logging out.");
                await logout();
                throw new Error("Session expired after max refresh attempts.");
              }
            } catch (error) {
              console.error("AuthContext: Error during token refresh:", error);
              isRefreshingRef.current = false;
              await logout();
              throw error;
            }
          } else {
            // Wait for ongoing refresh to complete
            try {
              await new Promise((res) => setTimeout(res, 1000));
              // After waiting, if still refreshing, increment retry count
              if (isRefreshingRef.current) {
                retryCount++;
              } else {
                // Retry original request if refresh completed
                return fetch(url, options);
              }
            } catch (error) {
              console.error("AuthContext: Error waiting for refresh:", error);
              throw error;
            }
          }
        }

        // If we get here, all retries failed
        await logout();
        throw new Error("Session expired. Please log in again.");
      }

      return originalResponse;
    },
    [logout]
  );

  const fetchUser = useCallback(
    async (isInitialLoad = false) => {
      if (isInitialLoad) {
        console.log("AuthContext: Initial fetchUser called. Setting isLoading true.");
        setIsLoading(true);
      }
      try {
        // Add retry logic with backoff
        let retries = 3;
        let lastError;

        while (retries > 0) {
          try {
            const response = await authenticatedFetch("/api/auth/me", {
              headers: isInitialLoad
                ? {
                    "X-No-Refresh": "true",
                  }
                : undefined,
            });

            if (response.ok) {
              const userData = await response.json();
              if (userData.success && userData.user) {
                setUser(userData.user);
                if (userData.user.organizationId) {
                  const orgResponse = await authenticatedFetch(
                    `/api/organizations/${userData.user.organizationId}`
                  );
                  if (orgResponse.ok) {
                    const orgData = await orgResponse.json();
                    setOrganization(orgData);
                    return; // Success - exit retry loop
                  }
                }
              }
              // If we get here with a 200 but no valid user, clear the state
              setUser(null);
              setOrganization(null);
              return;
            } else if (response.status === 401) {
              // Clear state on definitive unauthorized
              setUser(null);
              setOrganization(null);
              return;
            }
            throw new Error(`Failed to fetch user: ${response.status}`);
          } catch (err) {
            lastError = err;
            retries--;
            if (retries > 0) {
              await new Promise((res) => setTimeout(res, (3 - retries) * 1000));
            }
          }
        }

        // If we get here, all retries failed
        console.error("AuthContext: All retries failed:", lastError);
        setUser(null);
        setOrganization(null);
      } finally {
        if (isInitialLoad) {
          setIsLoading(false);
          console.log("AuthContext: fetchUser (initial load) finished, isLoading set to false.");
        }
      }
    },
    [authenticatedFetch]
  );

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<boolean> => {
    console.log(`AuthContext: login called for ${email}, rememberMe: ${rememberMe}`);
    if (isLoading && !user) {
      // Only set main isLoading if context is still in its initial app load phase.
      // This prevents UI flicker if login is called after initial load.
      // However, login form should manage its own submission state.
    }
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await response.json();
      console.log(`AuthContext: /api/auth/login response status: ${response.status}`, data);

      if (response.ok && data.success && data.user) {
        console.log("AuthContext: /api/auth/login successful. User data received directly.");
        setUser(data.user); // Set user from login response.
        // Fetch org details, this uses authenticatedFetch which might refresh if /me had just failed for some reason.
        if (data.user.organizationId) {
          try {
            const orgResponse = await authenticatedFetch(
              `/api/organizations/${data.user.organizationId}`
            );
            if (orgResponse.ok) {
              const orgData = await orgResponse.json();
              setOrganization(orgData);
            } else {
              setOrganization(null);
            }
          } catch (orgError) {
            console.error("AuthContext: Failed to fetch organization during login", orgError);
            setOrganization(null);
          }
        } else {
          setOrganization(null);
        }
        // Ensure main isLoading is false if login happens during initial app load.
        if (isLoading) setIsLoading(false);
        return true;
      } else {
        setUser(null);
        setOrganization(null);
        if (isLoading) setIsLoading(false);
        throw new Error(data.error || "Login API call failed.");
      }
    } catch (error) {
      console.error("AuthContext: Login error:", error);
      setUser(null);
      setOrganization(null);
      if (isLoading) setIsLoading(false);
      throw error;
    }
  };

  useEffect(() => {
    fetchUser(true); // Initial fetch on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array: run once on mount. fetchUser is stable due to useCallback.

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        user &&
        !isLoading &&
        !isRefreshingRef.current
      ) {
        console.log("AuthContext: Tab became visible, re-fetching user and organization.");
        fetchUser(false);
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchUser, user, isLoading]); // Add isLoading to dependencies for visibility change

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        fetchUser,
        authenticatedFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  console.log(context);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

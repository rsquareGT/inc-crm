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
        if (!isRefreshingRef.current) {
          isRefreshingRef.current = true;
          console.log(`AuthContext: API call to ${url} resulted in 401. Attempting token refresh.`);

          activeRefreshPromiseRef.current = fetch("/api/auth/refresh-token", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-No-Refresh": "true" },
          })
            .then(async (refreshResponse) => {
              if (refreshResponse.ok) {
                console.log(
                  "AuthContext: Token refresh successful. Retrying original request to",
                  url
                );
                return fetch(url, options); // Retry original request
              } else {
                console.warn("AuthContext: Token refresh failed. Logging out.");
                await logout();
                // Return the original 401 response or throw an error to indicate failure
                // Forcing a throw to make sure callers handle this as an unrecoverable auth error
                throw new Error("Session expired. Please log in again.");
              }
            })
            .catch(async (refreshError) => {
              console.error("AuthContext: Error during token refresh attempt:", refreshError);
              await logout();
              throw refreshError; // Re-throw to be caught by the caller
            })
            .finally(() => {
              isRefreshingRef.current = false;
              activeRefreshPromiseRef.current = null; // Clear the promise once resolved/rejected
            });
          return activeRefreshPromiseRef.current;
        } else if (activeRefreshPromiseRef.current) {
          console.log(`AuthContext: Queuing request to ${url} pending ongoing token refresh.`);
          // Wait for the ongoing refresh promise to resolve, then retry the original request
          return activeRefreshPromiseRef.current
            .then(async (refreshOutcomeResponse) => {
              // Check if the refresh itself was successful
              if (refreshOutcomeResponse.ok && refreshOutcomeResponse.url === url) {
                // This means the refresh promise resolved to the retried request
                return refreshOutcomeResponse;
              }
              // If refreshOutcomeResponse indicates the refresh failed (e.g. it's not the retried request or not ok)
              // or if the refresh promise threw an error which was caught above, then this path might not be hit as expected.
              // The primary goal is that if refresh succeeded, the new request should succeed.
              // If refresh failed, logout happened.
              // Here, we assume refreshPromise resolves successfully if token was refreshed,
              // then we make the new call.
              console.log(`AuthContext: Ongoing refresh completed. Retrying ${url}.`);
              return fetch(url, options); // Retry original request after current refresh op completes
            })
            .catch(async (err) => {
              // If the shared refresh promise itself failed, logout already happened.
              console.error(
                `AuthContext: Queued request to ${url} failed as ongoing refresh failed.`,
                err
              );
              throw new Error("Session expired due to failed refresh. Please log in again.");
            });
        } else {
          // Should not happen: isRefreshingRef is true, but no activeRefreshPromiseRef.
          console.error("AuthContext: Inconsistent refresh state. Logging out for safety.");
          await logout();
          throw new Error("Session refresh state error. Please log in again.");
        }
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
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

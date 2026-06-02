"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@/types/auth";
import { authApi } from "@/lib/apiClient";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const setIfActive = (next: AuthUser | null) => {
      if (!cancelled) setUser(next);
    };

    // apiFetch already auto-refreshes /auth/me on 401 via the shared
    // refresh-coalescing path, so a transient access-token expiry resolves
    // transparently. The catch below only fires when refresh genuinely
    // failed (no/expired/revoked refresh token, or backend unreachable),
    // which means the user truly isn't authenticated.
    authApi
      .me()
      .then((authUser) => setIfActive(authUser))
      .catch(() => setIfActive(null))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const nextId = user?.id ?? null;
    if (hasInitializedRef.current && previousUserIdRef.current !== null && previousUserIdRef.current !== nextId) {
      queryClient.clear();
    }
    previousUserIdRef.current = nextId;
    hasInitializedRef.current = true;
  }, [user?.id, queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    const authUser = await authApi.login({ email, password });
    setUser(authUser);
    return authUser;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const updateUser = useCallback((updated: AuthUser) => {
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}

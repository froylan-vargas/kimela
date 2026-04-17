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
import { authApi, ApiError } from "@/lib/apiClient";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    authApi
      .me()
      .then((authUser) => setUser(authUser))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setUser(null);
        } else {
          setUser(null);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const nextId = user?.id ?? null;
    if (hasInitializedRef.current && previousUserIdRef.current !== nextId) {
      queryClient.clear();
    }
    previousUserIdRef.current = nextId;
    hasInitializedRef.current = true;
  }, [user?.id, queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    const authUser = await authApi.login({ email, password });
    setUser(authUser);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
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

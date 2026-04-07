"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import type { AuthContextValue } from "@/context/AuthContext";
import type { AuthRole, AuthUser } from "@/types/auth";

export function useAuth(): AuthContextValue {
  return useAuthContext();
}

export function useRequireAuth(): AuthUser {
  const { user, isLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  return user as AuthUser;
}

export function useRequireRole(role: AuthRole): AuthUser {
  const { user, isLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== role)) {
      router.replace("/login");
    }
  }, [user, isLoading, role, router]);

  return user as AuthUser;
}

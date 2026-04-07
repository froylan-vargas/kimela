"use client";

import type { ReactNode } from "react";
import type { AuthRole } from "@/types/auth";
import { useAuth } from "@/hooks/useAuth";

interface RoleGuardProps {
  allowed: AuthRole | AuthRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGuard({
  allowed,
  fallback = null,
  children,
}: RoleGuardProps) {
  const { user } = useAuth();
  if (!user) return fallback;
  const roles = Array.isArray(allowed) ? allowed : [allowed];
  return roles.includes(user.role) ? children : fallback;
}

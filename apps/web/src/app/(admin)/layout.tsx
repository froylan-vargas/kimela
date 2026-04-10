"use client";

import type { ReactNode } from "react";
import { useAuth, useRequireRole } from "@/hooks/useAuth";
import AdminHeader from "@/components/admin/AdminHeader/AdminHeader";
import styles from "./layout.module.scss";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();
  useRequireRole("ADMIN");

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <AdminHeader />
      {children}
    </>
  );
}

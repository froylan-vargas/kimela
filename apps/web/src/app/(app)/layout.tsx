"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/lib/apiClient";
import Header from "@/components/Header/Header";
import styles from "./layout.module.scss";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  async function handleResend() {
    setResendLoading(true);
    try {
      await authApi.resendVerification();
      setResendSent(true);
    } finally {
      setResendLoading(false);
    }
  }

  const showBanner = user.emailVerifiedAt === null;

  return (
    <>
      <Header />
      {showBanner && (
        <div className={styles.verificationBanner}>
          <p>Verifica tu correo electrónico para acceder a todas las funciones.</p>
          {resendSent ? (
            <span className={styles.resendSuccess}>Correo enviado</span>
          ) : (
            <button onClick={handleResend} disabled={resendLoading}>
              {resendLoading ? "Enviando..." : "Reenviar correo"}
            </button>
          )}
        </div>
      )}
      {children}
    </>
  );
}

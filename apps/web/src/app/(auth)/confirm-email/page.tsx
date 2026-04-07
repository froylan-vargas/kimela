"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { authApi, ApiError } from "@/lib/apiClient";
import styles from "./page.module.scss";

type Status = "loading" | "success" | "error" | "no-token";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>(token ? "loading" : "no-token");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    authApi
      .confirmEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 400) {
          setStatus("error");
        } else {
          setStatus("error");
        }
      });
  }, [token]);

  async function handleResend() {
    setResendLoading(true);
    setResendError(null);
    try {
      await authApi.resendVerification();
      setResendSent(true);
    } catch {
      setResendError("No se pudo enviar el correo. Inténtalo de nuevo.");
    } finally {
      setResendLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <h1>Kimela</h1>
          </div>
          <div className={styles.status}>
            <div className={styles.spinner} aria-label="Verificando" />
            <p className={styles.statusText}>Verificando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <h1>Kimela</h1>
          </div>
          <div className={styles.status}>
            <p className={styles.successText}>
              ¡Correo verificado! Ya tienes acceso completo.
            </p>
            <Link href="/" className={styles.actionLink}>
              Ir a la aplicación
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // status === "error" || status === "no-token"
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1>Kimela</h1>
        </div>
        <div className={styles.status}>
          <div className={styles.error}>
            El enlace ha expirado o no es válido.
          </div>

          {user ? (
            resendSent ? (
              <p className={styles.successText}>
                Correo de verificación enviado. Revisa tu bandeja de entrada.
              </p>
            ) : (
              <>
                {resendError && (
                  <div className={styles.error}>{resendError}</div>
                )}
                <button
                  className={styles.submit}
                  onClick={handleResend}
                  disabled={resendLoading}
                >
                  {resendLoading
                    ? "Enviando..."
                    : "Reenviar correo de verificación"}
                </button>
              </>
            )
          ) : (
            <Link href="/login" className={styles.actionLink}>
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Cargando...
        </div>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  );
}

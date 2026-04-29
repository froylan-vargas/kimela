"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authApi, ApiError } from "@/lib/apiClient";
import styles from "./page.module.scss";

type Status = "loading" | "success" | "error" | "no-token";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>(token ? "loading" : "no-token");

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

  if (status === "loading") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <h1>qimela</h1>
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
            <h1>qimela</h1>
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
          <h1>qimela</h1>
        </div>
        <div className={styles.status}>
          <div className={styles.error}>
            El enlace ha expirado o no es válido.
          </div>
          <p className={styles.statusText}>
            Vuelve a iniciar sesión para solicitar un nuevo correo de
            verificación.
          </p>
          <Link href="/login" className={styles.actionLink}>
            Iniciar sesión
          </Link>
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

"use client";

import { Suspense, type FormEvent, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, ApiError } from "@/lib/apiClient";
import styles from "./page.module.scss";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push("/login");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <h1>qimela</h1>
          </div>
          <div className={styles.error}>
            El enlace ha expirado o no es válido.
          </div>
        </div>
      </div>
    );
  }

  function validate(): string | null {
    if (password !== confirmPassword) {
      return "Las contraseñas no coinciden.";
    }
    if (!PASSWORD_REGEX.test(password)) {
      return "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.";
    }
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);

    const error = validate();
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword(token!, password);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setApiError("El enlace ha expirado o no es válido.");
      } else {
        setApiError("Algo salió mal, intenta de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <h1>qimela</h1>
          </div>
          <div className={styles.successBox}>
            ¡Contraseña restablecida correctamente. Redirigiendo al inicio de
            sesión...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1>qimela</h1>
          <p>Establece tu nueva contraseña</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {(validationError || apiError) && (
            <div className={styles.error}>{validationError ?? apiError}</div>
          )}

          <div className={styles.field}>
            <label htmlFor="password">Nueva contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className={styles.submit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando..." : "Restablecer contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}

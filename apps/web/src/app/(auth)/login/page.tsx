"use client";

import { Suspense, type FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { authApi, ApiError } from "@/lib/apiClient";
import { useQimelaContext } from "@/context/QimelaContext";
import { fetchQimelas, qimelasQueryKey } from "@/hooks/useQimelas";
import { resolveQimelaLandingTarget } from "@/lib/qimelaNavigation";
import styles from "./page.module.scss";

function LoginForm() {
  const { login } = useAuth();
  const { selectQimela, clearQimela } = useQimelaContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendMessage(null);
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      const explicitRedirect = searchParams.get("redirect");
      if (explicitRedirect) {
        router.push(explicitRedirect);
        return;
      }

      if (user.role === "ADMIN") {
        clearQimela();
        router.push("/admin/events");
        return;
      }

      let target;
      try {
        const qimelas = await queryClient.fetchQuery({
          queryKey: qimelasQueryKey,
          queryFn: fetchQimelas,
        });
        target = resolveQimelaLandingTarget(user, qimelas);
      } catch {
        target = resolveQimelaLandingTarget(user, undefined);
      }

      if (target.qimela && target.viewAs) {
        selectQimela(target.qimela, target.viewAs);
      } else {
        clearQimela();
      }

      const redirect = target.href;
      router.push(redirect);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 401 &&
        err.code === "EMAIL_NOT_VERIFIED"
      ) {
        setNeedsVerification(true);
        setError(
          "Tu correo todavía no ha sido verificado. Revisa tu bandeja de entrada o vuelve a solicitar el mensaje de confirmación.",
        );
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Correo o contraseña incorrectos");
      } else {
        console.error("[LoginPage] Unexpected login error", err);
        setError("Algo salió mal, intenta de nuevo");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!email) {
      setResendMessage("Escribe tu correo para reenviar la verificación.");
      return;
    }

    setIsResending(true);
    setResendMessage(null);

    try {
      await authApi.resendVerification(email);
      setResendMessage(
        "Si tu cuenta sigue pendiente de verificación, te enviamos un nuevo correo. Revisa también spam o correo no deseado.",
      );
    } catch {
      setResendMessage("No se pudo procesar la solicitud. Inténtalo de nuevo.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.field}>
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@ejemplo.com"
          required
          autoComplete="email"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={8}
          autoComplete="current-password"
        />
      </div>

      <button type="submit" className={styles.submit} disabled={isSubmitting}>
        {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
      </button>

      {needsVerification && (
        <div className={styles.verificationBox}>
          <p className={styles.verificationText}>
            Necesitas confirmar tu correo antes de entrar.
          </p>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? "Enviando..." : "Reenviar correo de verificación"}
          </button>
          {resendMessage && (
            <p className={styles.verificationHint}>{resendMessage}</p>
          )}
        </div>
      )}

      <Link href="/forgot-password" className={styles.forgotLink}>
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1>qimela</h1>
          <p>Inicia sesión en tu cuenta</p>
        </div>

        <Suspense fallback={<div className={styles.form} />}>
          <LoginForm />
        </Suspense>

        <p className={styles.footer}>
          ¿No tienes cuenta? <Link href="/register">Crea una</Link>
        </p>
      </div>
    </div>
  );
}

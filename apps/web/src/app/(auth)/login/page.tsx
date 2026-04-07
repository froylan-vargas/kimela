"use client";

import { Suspense, type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/apiClient";
import styles from "./page.module.scss";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      const redirect = searchParams.get("redirect") ?? "/dashboard";
      router.push(redirect);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Correo o contraseña incorrectos");
      } else {
        setError("Algo salió mal, intenta de nuevo");
      }
    } finally {
      setIsSubmitting(false);
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

      <button
        type="submit"
        className={styles.submit}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
      </button>

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
          <h1>Kimela</h1>
          <p>Inicia sesión en tu cuenta</p>
        </div>

        <Suspense fallback={<div className={styles.form} />}>
          <LoginForm />
        </Suspense>

        <p className={styles.footer}>
          ¿No tienes cuenta?{" "}
          <Link href="/register">Crea una</Link>
        </p>
      </div>
    </div>
  );
}

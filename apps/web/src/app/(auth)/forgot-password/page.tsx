"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { authApi } from "@/lib/apiClient";
import styles from "./page.module.scss";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email);
    } catch {
      // Always show the same success message — never reveal if email exists
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1>qimela</h1>
          <p>Recupera tu contraseña</p>
        </div>

        {submitted ? (
          <div className={styles.successBox}>
            <p>
              Si existe una cuenta con ese correo, recibirás un enlace para
              restablecer tu contraseña.
            </p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
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

            <button
              type="submit"
              className={styles.submit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
          </form>
        )}

        <p className={styles.footer}>
          <Link href="/login">Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}

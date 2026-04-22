"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, ApiError } from "@/lib/apiClient";
import styles from "./page.module.scss";

const NAME_MAX_LENGTH = 30;
const NAME_ALLOWED_PATTERN = /^[\p{L}\p{N}._ -]+$/u;

const PASSWORD_REQUIREMENTS = [
  {
    id: "length",
    label: "Al menos 8 caracteres",
    isMet: (password: string) => password.length >= 8,
  },
  {
    id: "uppercase",
    label: "Al menos una mayúscula",
    isMet: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "Al menos una minúscula",
    isMet: (password: string) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "Al menos un número",
    isMet: (password: string) => /\d/.test(password),
  },
  {
    id: "special",
    label: "Al menos un carácter especial",
    isMet: (password: string) => /[\W_]/.test(password),
  },
] as const;

function validateName(name: string): string | null {
  if (name.length < 4) return "El nombre debe tener al menos 4 caracteres";
  if (name.length > NAME_MAX_LENGTH) {
    return `El nombre no puede tener más de ${NAME_MAX_LENGTH} caracteres`;
  }
  if (!NAME_ALLOWED_PATTERN.test(name)) {
    return "El nombre con el que te verán solo puede contener letras, números, espacios, puntos, guiones y guion bajo";
  }
  return null;
}

function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return "El formato del correo electrónico no es válido";
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 8)
    return "La contraseña debe tener al menos 8 caracteres";
  if (!/[A-Z]/.test(password))
    return "La contraseña debe incluir al menos una mayúscula";
  if (!/[a-z]/.test(password))
    return "La contraseña debe incluir al menos una minúscula";
  if (!/\d/.test(password))
    return "La contraseña debe incluir al menos un número";
  if (!/[\W_]/.test(password))
    return "La contraseña debe incluir al menos un carácter especial";
  return null;
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const unmetPasswordRequirements = PASSWORD_REQUIREMENTS.filter(
    (requirement) => !requirement.isMet(password),
  );

  function handleNameChange(value: string) {
    setName(value);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const nameError = validateName(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.register({ name, email, password });
      router.push(`/register/success?email=${encodeURIComponent(email)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Ya existe una cuenta con este correo");
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else {
        setError("Algo salió mal, intenta de nuevo");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1>Qimela</h1>
          <p>Crea tu cuenta</p>
        </div>

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
            <label htmlFor="name">Nombre con el que te verán los demás</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Jugador"
              required
              minLength={4}
              maxLength={NAME_MAX_LENGTH}
              autoComplete="off"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Contraseña </label>
            <ul className={styles.hints} aria-live="polite">
              {unmetPasswordRequirements.map((requirement) => (
                <li key={requirement.id} className={styles.hint}>
                  {requirement.label}
                </li>
              ))}
            </ul>
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
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className={styles.footer}>
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}

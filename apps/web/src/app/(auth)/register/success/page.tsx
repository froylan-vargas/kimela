"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.scss";

function RegisterSuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.badge}>Cuenta creada</div>
        <div className={styles.hero}>
          <h1>¡Bienvenido a qimela!</h1>
          <p>
            Usuario creado con éxito. Te enviamos un correo de confirmación
            {email ? ` a ${email}` : ""} para que actives tu cuenta antes de
            empezar a jugar. Si no lo encuentras en tu bandeja de entrada,
            revisa también la carpeta de spam o correo no deseado.
          </p>
        </div>

        <div className={styles.panel}>
          <h2>Siguiente paso</h2>
          <p>
            Abre el enlace de confirmación desde tu correo. Cuando completes la
            verificación, ya podrás iniciar sesión en qimela.
          </p>
        </div>

        <div className={styles.actions}>
          <Link href="/login" className={styles.primaryAction}>
            Ir a iniciar sesión
          </Link>
          <Link href="/" className={styles.secondaryAction}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={<div className={styles.fallback}>Cargando...</div>}>
      <RegisterSuccessContent />
    </Suspense>
  );
}

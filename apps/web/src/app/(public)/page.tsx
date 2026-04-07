import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.scss";

export default async function LandingPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token");

  if (accessToken) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.landing}>
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className={styles.navbar}>
        <Link href="/" className={styles.navLogo}>
          Kimela<span>.</span>
        </Link>

        <div className={styles.navLinks}>
          <Link href="/login" className={styles.navLink}>
            Iniciar sesión
          </Link>
          <Link href="/register" className={styles.navCta}>
            Regístrate
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.glow} aria-hidden="true" />

        <div className={styles.heroContent}>
          <h1 className={styles.headline}>
            Tu quiniela deportiva, simplificada
          </h1>
          <p className={styles.subheadline}>
            Crea y participa en quinielas deportivas con tus amigos.
            Rápido, fácil y divertido.
          </p>

          <div className={styles.ctaGroup}>
            <Link href="/register" className={styles.ctaPrimary}>
              Regístrate gratis
            </Link>
            <span className={styles.ctaDivider}>o</span>
            <Link href="/login" className={styles.ctaSecondary}>
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <span className={styles.footerCopy}>
          © {new Date().getFullYear()} Kimela. Todos los derechos reservados.
        </span>
      </footer>
    </div>
  );
}

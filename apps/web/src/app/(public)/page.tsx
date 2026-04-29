import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Header/Logo";
import HomeStepShowcase from "@/components/home/HomeStepShowcase";
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
        <Logo variant="inverse" />

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
        <div className={styles.heroGlow} aria-hidden="true" />

        <div className={styles.heroContent}>
          <h1 className={styles.headline}>
            Tu quiniela deportiva,
            <span>simplificada</span>
          </h1>

          <HomeStepShowcase />
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <span className={styles.footerCopy}>
          © {new Date().getFullYear()} qimela. Todos los derechos reservados.
        </span>
      </footer>
    </div>
  );
}

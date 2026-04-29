import Link from "next/link";
import styles from "./HomeStepShowcase.module.scss";

interface HomeStepShowcaseProps {
  variant?: "hero" | "dashboard";
}

const steps = [
  {
    title: "Crea tu qimela",
    variant: "side",
    icon: (
      <svg viewBox="0 0 64 64" role="img" aria-label="Tarjeta de qimela">
        <rect x="11" y="13" width="42" height="36" rx="7" />
        <path d="M19 25h20" />
        <path d="M19 36h15" />
        <circle cx="43" cy="36" r="5" />
        <path d="m40.5 36 1.8 1.8 3.4-4" />
      </svg>
    ),
  },
  {
    title: "Invita a tus amigos",
    variant: "active",
    icon: (
      <svg viewBox="0 0 64 64" role="img" aria-label="Invitar amigos">
        <circle cx="25" cy="23" r="9" />
        <path d="M9 50c0-10 7-17 16-17s16 7 16 17" />
        <path d="M41 21h14" />
        <path d="M48 14v14" />
        <path d="M35 50v-4c0-6 4-10 10-10 5 0 9 3 10 8" />
      </svg>
    ),
  },
  {
    title: "¡Diviértanse!",
    variant: "side",
    icon: (
      <svg viewBox="0 0 64 64" role="img" aria-label="Qimela lista">
        <circle cx="32" cy="32" r="15" />
        <path d="m23 32 6 6 13-15" />
        <path d="M32 8v7" />
        <path d="M32 49v7" />
        <path d="M8 32h7" />
        <path d="M49 32h7" />
        <path d="m15 15 5 5" />
        <path d="m44 44 5 5" />
        <path d="m49 15-5 5" />
        <path d="m20 44-5 5" />
      </svg>
    ),
  },
];

export default function HomeStepShowcase({
  variant = "hero",
}: HomeStepShowcaseProps) {
  const isDashboard = variant === "dashboard";

  return (
    <>
      <div
        className={`${styles.stepShowcase} ${
          isDashboard ? styles.dashboardShowcase : ""
        }`}
        aria-label="Cómo funciona"
      >
        {steps.map((step) => (
          <article
            className={`${styles.stepCard} ${
              step.variant === "active" ? styles.stepCardActive : ""
            }`}
            key={step.title}
          >
            <div className={styles.stepIcon}>{step.icon}</div>
            <h2>{step.title}</h2>
          </article>
        ))}
      </div>
      {isDashboard && (
        <Link
          className={`${styles.createCta} ${styles.dashboardCreateCta}`}
          href="/qimela/create"
        >
          + Crea tu qimela
        </Link>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useQimelaContext } from "@/context/QimelaContext";
import styles from "./Logo.module.scss";

interface LogoProps {
  href?: string;
  variant?: "default" | "inverse";
}

export default function Logo({ href = "/", variant = "default" }: LogoProps) {
  const { clearQimela } = useQimelaContext();

  function handleClick() {
    if (href === "/dashboard") {
      clearQimela();
    }
  }

  return (
    <Link href={href} className={styles.logo} onClick={handleClick}>
      <span className={styles.logoMark}>
        <Image
          src="/images/qimela_logo_transparent.png"
          alt="qimela"
          width={250}
          height={64}
          className={styles.logoImage}
          priority
        />
      </span>
      <span
        className={`${styles.logoText} ${variant === "inverse" ? styles.logoTextInverse : ""}`}
        aria-hidden="true"
      >
        qimela
      </span>
    </Link>
  );
}

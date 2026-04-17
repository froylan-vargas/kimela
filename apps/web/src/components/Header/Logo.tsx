"use client";

import Link from "next/link";
import { useQimelaContext } from "@/context/QimelaContext";
import styles from "./Logo.module.scss";

interface LogoProps {
  href?: string;
}

export default function Logo({ href = "/" }: LogoProps) {
  const { clearQimela } = useQimelaContext();

  function handleClick() {
    if (href === "/dashboard") {
      clearQimela();
    }
  }

  return (
    <Link href={href} className={styles.logo} onClick={handleClick}>
      <i className={`ph-bold ph-trophy ${styles.icon}`} />
    </Link>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
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
      <Image
        src="/images/qimela_logo_transparent.png"
        alt="Qimela"
        width={250}
        height={64}
        className={styles.logoImage}
        priority
      />
    </Link>
  );
}

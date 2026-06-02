"use client";

import Link from "next/link";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchQimelas, qimelasQueryKey } from "@/hooks/useQimelas";
import { useQimelaContext } from "@/context/QimelaContext";
import { resolveQimelaLandingTarget } from "@/lib/qimelaNavigation";
import styles from "./Logo.module.scss";

interface LogoProps {
  href?: string;
  variant?: "default" | "inverse";
}

export default function Logo({ href = "/", variant = "default" }: LogoProps) {
  const { user } = useAuth();
  const { selectQimela, clearQimela } = useQimelaContext();
  const queryClient = useQueryClient();
  const router = useRouter();

  async function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (href !== "/dashboard") return;

    e.preventDefault();

    try {
      const qimelas = await queryClient.fetchQuery({
        queryKey: qimelasQueryKey,
        queryFn: fetchQimelas,
      });
      const target = resolveQimelaLandingTarget(user, qimelas);

      if (target.qimela && target.viewAs) {
        selectQimela(target.qimela, target.viewAs);
      } else {
        clearQimela();
      }

      router.push(target.href);
    } catch {
      clearQimela();
      router.push(href);
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

"use client";

import { useRouter } from "next/navigation";
import styles from "./page.module.scss";

export default function BackButton() {
  const router = useRouter();
  return (
    <button type="button" className={styles.back} onClick={() => router.back()}>
      ← Volver
    </button>
  );
}

"use client";

import { useToastItems } from "@/context/ToastContext";
import ToastItem from "./ToastItem";
import styles from "./Toast.module.scss";

export default function ToastContainer() {
  const { toasts } = useToastItems();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container} aria-live="polite" aria-atomic="false">
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} />
      ))}
    </div>
  );
}

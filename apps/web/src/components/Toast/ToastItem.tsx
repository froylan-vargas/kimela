"use client";

import { useToastItems, type ToastItem as ToastItemType } from "@/context/ToastContext";
import styles from "./Toast.module.scss";

interface Props {
  item: ToastItemType;
}

export default function ToastItem({ item }: Props) {
  const { remove } = useToastItems();

  return (
    <div className={`${styles.toast} ${styles[`toast--${item.variant}`]}`}>
      <span className={styles.icon}>
        {item.variant === "success" ? (
          <i className="ph ph-check-circle" />
        ) : (
          <i className="ph ph-x-circle" />
        )}
      </span>
      <span className={styles.message}>{item.message}</span>
      <button
        type="button"
        className={styles.close}
        onClick={() => remove(item.id)}
        aria-label="Cerrar notificación"
      >
        <i className="ph ph-x" />
      </button>
    </div>
  );
}

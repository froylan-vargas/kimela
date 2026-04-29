"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { qimela, QimelaRole } from "@/types/qimela";
import styles from "./QimelaDropdown.module.scss";

interface QimelaDropdownProps {
  participatingQimelas: qimela[];
  creatorQimelas: qimela[];
  selectedId: string | null;
  selectedViewAs: QimelaRole | null;
  onSelect: (qimela: qimela, viewAs: QimelaRole) => void;
  onClose: () => void;
}

export default function QimelaDropdown({
  participatingQimelas,
  creatorQimelas,
  selectedId,
  selectedViewAs,
  onSelect,
  onClose,
}: QimelaDropdownProps) {
  const router = useRouter();

  function handleSelect(qimela: qimela, viewAs: QimelaRole) {
    onSelect(qimela, viewAs);
    onClose();
    if (viewAs === "CREATOR") {
      router.push(`/qimela/${qimela.id}`);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className={styles.dropdown}>
      <Link
        href="/qimela/create"
        className={styles.createItem}
        onClick={onClose}
      >
        + Crea tu qimela
      </Link>
      <div className={styles.divider} />
      {participatingQimelas.length > 0 && (
        <div>
          <p className={styles.sectionTitle}>Participando</p>
          {participatingQimelas.map((qimela) => {
            const isSelected =
              qimela.id === selectedId && selectedViewAs === "SUBSCRIBER";
            return (
              <button
                key={qimela.id}
                className={`${styles.item} ${isSelected ? styles.selected : ""}`}
                onClick={() => handleSelect(qimela, "SUBSCRIBER")}
                type="button"
              >
                {qimela.name}
              </button>
            );
          })}
        </div>
      )}

      {participatingQimelas.length > 0 && <div className={styles.divider} />}

      <div>
        <p className={styles.sectionTitle}>Creadas</p>
        {creatorQimelas.length === 0 ? (
          <p className={styles.emptySection}>No has creado qimelas</p>
        ) : (
          creatorQimelas.map((qimela) => {
            const isSelected =
              qimela.id === selectedId && selectedViewAs === "CREATOR";
            return (
              <button
                key={qimela.id}
                className={`${styles.item} ${isSelected ? styles.selected : ""}`}
                onClick={() => handleSelect(qimela, "CREATOR")}
                type="button"
              >
                {qimela.name}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

"use client";

import type { Qimela, QimelaRole } from "@/types/qimela";
import styles from "./QimelaDropdown.module.scss";

interface QimelaDropdownProps {
  participatingQimelas: Qimela[];
  creatorQimelas: Qimela[];
  selectedId: string | null;
  selectedViewAs: QimelaRole | null;
  onSelect: (qimela: Qimela, viewAs: QimelaRole) => void;
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
  function handleSelect(qimela: Qimela, viewAs: QimelaRole) {
    onSelect(qimela, viewAs);
    onClose();
  }

  return (
    <div className={styles.dropdown}>
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

      {participatingQimelas.length > 0 && creatorQimelas.length > 0 && (
        <div className={styles.divider} />
      )}

      {creatorQimelas.length > 0 && (
        <div>
          <p className={styles.sectionTitle}>Creadas</p>
          {creatorQimelas.map((qimela) => {
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
          })}
        </div>
      )}
    </div>
  );
}

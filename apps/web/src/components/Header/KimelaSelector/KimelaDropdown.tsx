"use client";

import type { Kimela, KimelaRole } from "@/types/kimela";
import styles from "./KimelaDropdown.module.scss";

interface KimelaDropdownProps {
  participatingKimelas: Kimela[];
  creatorKimelas: Kimela[];
  selectedId: string | null;
  selectedViewAs: KimelaRole | null;
  onSelect: (kimela: Kimela, viewAs: KimelaRole) => void;
  onClose: () => void;
}

export default function KimelaDropdown({
  participatingKimelas,
  creatorKimelas,
  selectedId,
  selectedViewAs,
  onSelect,
  onClose,
}: KimelaDropdownProps) {
  function handleSelect(kimela: Kimela, viewAs: KimelaRole) {
    onSelect(kimela, viewAs);
    onClose();
  }

  return (
    <div className={styles.dropdown}>
      {participatingKimelas.length > 0 && (
        <div>
          <p className={styles.sectionTitle}>Participando</p>
          {participatingKimelas.map((kimela) => {
            const isSelected =
              kimela.id === selectedId && selectedViewAs === "SUBSCRIBER";
            return (
              <button
                key={kimela.id}
                className={`${styles.item} ${isSelected ? styles.selected : ""}`}
                onClick={() => handleSelect(kimela, "SUBSCRIBER")}
                type="button"
              >
                {kimela.name}
              </button>
            );
          })}
        </div>
      )}

      {participatingKimelas.length > 0 && creatorKimelas.length > 0 && (
        <div className={styles.divider} />
      )}

      {creatorKimelas.length > 0 && (
        <div>
          <p className={styles.sectionTitle}>Creadas</p>
          {creatorKimelas.map((kimela) => {
            const isSelected =
              kimela.id === selectedId && selectedViewAs === "CREATOR";
            return (
              <button
                key={kimela.id}
                className={`${styles.item} ${isSelected ? styles.selected : ""}`}
                onClick={() => handleSelect(kimela, "CREATOR")}
                type="button"
              >
                {kimela.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

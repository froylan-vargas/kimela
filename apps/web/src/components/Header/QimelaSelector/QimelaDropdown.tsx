"use client";

import { useRouter, usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const hasParticipatingQimelas = participatingQimelas.length > 0;
  const hasCreatorQimelas = creatorQimelas.length > 0;

  function handleSelect(qimela: qimela, viewAs: QimelaRole) {
    onSelect(qimela, viewAs);
    onClose();
    const subRouteMatch = pathname.match(/^\/qimela\/[^/]+\/(results|sessions)$/);
    if (subRouteMatch) {
      router.push(`/qimela/${qimela.id}/${subRouteMatch[1]}`);
      return;
    }
    if (viewAs === "CREATOR") {
      router.push(`/qimela/${qimela.id}`);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className={styles.dropdown}>
      {hasParticipatingQimelas && (
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

      {hasParticipatingQimelas && hasCreatorQimelas && (
        <div className={styles.divider} />
      )}

      {hasCreatorQimelas && (
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

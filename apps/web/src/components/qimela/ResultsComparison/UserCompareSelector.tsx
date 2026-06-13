"use client";

import { useMemo, useState } from "react";
import styles from "./UserCompareSelector.module.scss";

export interface CompareUserOption {
  userId: string;
  userName: string;
  initials: string;
}

interface UserCompareSelectorProps {
  options: CompareUserOption[];
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  maxSelectable?: number;
}

export default function UserCompareSelector({
  options,
  selectedUserIds,
  onChange,
  maxSelectable = 3,
}: UserCompareSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      option.userName.toLowerCase().includes(term),
    );
  }, [options, search]);

  const selectedCount = selectedUserIds.length;
  const selectedOptions = options.filter((opt) =>
    selectedUserIds.includes(opt.userId),
  );

  function toggle(userId: string) {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
      return;
    }
    if (selectedCount >= maxSelectable) return;
    onChange([...selectedUserIds, userId]);
  }

  function clear() {
    setSearch("");
    onChange([]);
  }

  return (
    <section className={styles.wrap} aria-label="Usuarios para comparar">
      <header className={styles.header}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span className={styles.toggleLabel}>
            Comparar con otros
            {selectedCount > 0 && (
              <span className={styles.count} aria-label={`${selectedCount} seleccionados`}>
                {selectedCount}/{maxSelectable}
              </span>
            )}
          </span>
          <span className={styles.chevron} aria-hidden="true">
            {isOpen ? "▾" : "▸"}
          </span>
        </button>
        {(selectedCount > 0 || search) && (
          <button type="button" className={styles.clear} onClick={clear}>
            Limpiar
          </button>
        )}
      </header>

      {!isOpen && selectedOptions.length > 0 && (
        <div className={styles.pills} aria-label="Usuarios seleccionados">
          {selectedOptions.map((option) => (
            <span key={option.userId} className={styles.pill}>
              <span className={styles.pillAvatar} aria-hidden="true">
                {option.initials}
              </span>
              <span className={styles.pillName}>{option.userName}</span>
              <button
                type="button"
                className={styles.pillRemove}
                aria-label={`Quitar ${option.userName}`}
                onClick={() => toggle(option.userId)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div className={styles.panel}>
          <input
            type="search"
            name="qimela-compare-user-search"
            className={styles.search}
            placeholder="Buscar..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar usuario"
            autoComplete="new-password"
            inputMode="search"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            data-lpignore="true"
          />
          <ul className={styles.list}>
            {filtered.length === 0 && (
              <li className={styles.empty}>No se encontraron usuarios.</li>
            )}
            {filtered.map((option) => {
              const checked = selectedUserIds.includes(option.userId);
              const disabled = !checked && selectedCount >= maxSelectable;
              return (
                <li key={option.userId}>
                  <label
                    className={`${styles.item} ${disabled ? styles.itemDisabled : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(option.userId)}
                    />
                    <span className={styles.avatar} aria-hidden="true">
                      {option.initials}
                    </span>
                    <span className={styles.name}>{option.userName}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className={styles.hint}>Máximo {maxSelectable} usuarios.</p>
        </div>
      )}
    </section>
  );
}

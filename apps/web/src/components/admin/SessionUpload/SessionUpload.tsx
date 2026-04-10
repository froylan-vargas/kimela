"use client";

// NOTE: This component only supports MATCHUP format sports (soccer, tennis, etc.).
// RACE format (F1, NASCAR, etc.) requires a different upload flow and is not yet implemented.
// The backend will reject uploads for non-MATCHUP sports with a 400 error.

import { useRef, useState, useCallback } from "react";
import styles from "./SessionUpload.module.scss";

interface SessionUploadProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

export default function SessionUpload({ onUpload, isUploading }: SessionUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        await onUpload(file);
      } catch {
        setError("El archivo no tiene el formato correcto.");
      }
    },
    [onUpload],
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ""} ${isUploading ? styles.uploading : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label="Zona de carga de archivo CSV"
      >
        <svg
          className={styles.icon}
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 16V8M12 8L9 11M12 8L15 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 16.5V18.75C3 19.993 4.007 21 5.25 21H18.75C19.993 21 21 19.993 21 18.75V16.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        {isUploading ? (
          <p className={styles.hint}>Cargando archivo...</p>
        ) : (
          <>
            <p className={styles.hint}>
              Arrastra tu archivo aqui o
            </p>
            <button
              type="button"
              className={styles.chooseBtn}
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              Elegir archivo
            </button>
          </>
        )}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className={styles.hiddenInput}
        onChange={handleInputChange}
        disabled={isUploading}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}

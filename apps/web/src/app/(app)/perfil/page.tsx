"use client";

import { useRef, useState } from "react";
import { useAuth, useRequireAuth } from "@/hooks/useAuth";
import { usersApi, ApiError } from "@/lib/apiClient";
import styles from "./page.module.scss";

function getInitials(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export default function PerfilPage() {
  const user = useRequireAuth();
  const { updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  if (!user) return null;

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === user.name) return;

    setNameLoading(true);
    setNameError(null);
    setNameSuccess(false);
    try {
      const updated = await usersApi.updateProfile(trimmed);
      updateUser(updated);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      setNameError(err instanceof ApiError ? err.message : "Error al guardar el nombre");
    } finally {
      setNameLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setAvatarError("Solo se permiten imágenes JPEG, PNG o WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("La imagen no puede superar 5 MB");
      return;
    }

    setAvatarLoading(true);
    setAvatarError(null);
    try {
      const updated = await usersApi.uploadAvatar(file);
      updateUser(updated);
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : "Error al subir la imagen");
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Mi perfil</h1>

        <section className={styles.section} aria-labelledby="avatar-heading">
          <h2 className={styles.sectionTitle} id="avatar-heading">Foto de perfil</h2>

          <div className={styles.avatarRow}>
            <button
              type="button"
              className={styles.avatarWrapper}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Cambiar foto de perfil"
              disabled={avatarLoading}
            >
              {user.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt={user.name} className={styles.avatarImg} />
              ) : (
                <span className={styles.avatarInitials}>{getInitials(user.name)}</span>
              )}
              <span className={styles.avatarOverlay} aria-hidden="true">
                {avatarLoading ? "..." : "Cambiar"}
              </span>
            </button>

            <div className={styles.avatarInfo}>
              <p className={styles.avatarHint}>
                Haz clic en la imagen para subir una nueva foto.
              </p>
              <p className={styles.avatarHint}>JPEG, PNG o WebP · máx. 5 MB</p>
              {avatarError && <p className={styles.error}>{avatarError}</p>}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.hiddenInput}
            onChange={handleFileChange}
            aria-hidden="true"
            tabIndex={-1}
          />
        </section>

        <section className={styles.section} aria-labelledby="name-heading">
          <h2 className={styles.sectionTitle} id="name-heading">Nombre</h2>

          <form onSubmit={handleNameSubmit} className={styles.nameForm} noValidate>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.nameInput}
              maxLength={80}
              aria-label="Nombre"
              disabled={nameLoading}
            />
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={nameLoading || !name.trim() || name.trim() === user.name}
            >
              {nameLoading ? "Guardando..." : "Guardar"}
            </button>
          </form>

          {nameError && <p className={styles.error}>{nameError}</p>}
          {nameSuccess && <p className={styles.success}>Nombre actualizado correctamente</p>}
        </section>
      </div>
    </main>
  );
}

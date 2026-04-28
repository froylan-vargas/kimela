"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon/Icon";
import { useAuth } from "@/hooks/useAuth";
import styles from "./UserProfile.module.scss";

interface UserProfileProps {
  name: string;
  imageUrl?: string | null;
}

function getInitials(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export default function UserProfile({ name, imageUrl }: UserProfileProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className={styles.userProfile} ref={wrapperRef}>
      <div className={styles.menuWrapper}>
        <button
          type="button"
          className={styles.avatarButton}
          onClick={() => setIsAccountMenuOpen((prev) => !prev)}
          aria-label={`Cuenta de ${name}`}
          aria-expanded={isAccountMenuOpen}
          aria-haspopup="menu"
        >
          <div className={styles.avatar} title={name}>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={name} className={styles.avatarImg} />
            ) : (
              getInitials(name)
            )}
          </div>
        </button>

        {isAccountMenuOpen && (
          <div className={`${styles.dropdownMenu} ${styles.accountMenu}`} role="menu" aria-label="Cuenta">
            <Link
              href="/perfil"
              className={styles.menuItem}
              onClick={() => setIsAccountMenuOpen(false)}
            >
              <Icon name="user" className={styles.menuIcon} />
              Mi perfil
            </Link>
            <Link
              href="/qimela/create"
              className={styles.menuItem}
              onClick={() => setIsAccountMenuOpen(false)}
            >
              <Icon name="plus" className={styles.menuIcon} />
              Crea tu qimela
            </Link>
            <button
              type="button"
              className={styles.menuItem}
              onClick={handleLogout}
            >
              <Icon name="sign-out" className={styles.menuIcon} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

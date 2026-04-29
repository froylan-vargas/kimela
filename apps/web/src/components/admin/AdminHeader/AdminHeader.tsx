"use client";

import Link from "next/link";
import Logo from "@/components/Header/Logo";
import UserProfile from "@/components/Header/UserProfile";
import styles from "./AdminHeader.module.scss";
import { useAuth } from "@/hooks/useAuth";

export default function AdminHeader() {
  const { user } = useAuth();

  return (
    <header className={styles.navbar}>
      <Logo href="/admin/events" variant="inverse" />
      <nav className={styles.nav}>
        <Link href="/admin/events" className={styles.navLink}>
          Eventos
        </Link>
      </nav>
      {user && <UserProfile name={user.name} />}
    </header>
  );
}

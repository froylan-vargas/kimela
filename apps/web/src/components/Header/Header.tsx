"use client";

import Link from "next/link";
import Logo from "./Logo";
import QimelaSelector from "./QimelaSelector/QimelaSelector";
import UserProfile from "./UserProfile";
import styles from "./Header.module.scss";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { user } = useAuth();

  return (
    <header className={styles.navbar}>
      <Logo />
      <QimelaSelector />
      <nav className={styles.nav}>
        <Link href="/qimela/create" className={styles.createLink}>
          + Crear Qimela
        </Link>
      </nav>
      {user && <UserProfile name={user.name} />}
    </header>
  );
}

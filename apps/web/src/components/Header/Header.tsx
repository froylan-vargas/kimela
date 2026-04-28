"use client";

import Logo from "./Logo";
import QimelaSelector from "./QimelaSelector/QimelaSelector";
import UserProfile from "./UserProfile";
import styles from "./Header.module.scss";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { user } = useAuth();

  return (
    <header className={styles.navbar}>
      <Logo href="/dashboard" />
      <div className={styles.centerGroup}>
        <QimelaSelector />
      </div>
      {user && <UserProfile name={user.name} imageUrl={user.imageUrl} />}
    </header>
  );
}

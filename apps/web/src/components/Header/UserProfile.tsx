"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import styles from "./UserProfile.module.scss";

interface UserProfileProps {
  name: string;
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

export default function UserProfile({ name }: UserProfileProps) {
  const { logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className={styles.userProfile}>
      <i className={`ph-bold ph-bell ${styles.bellIcon}`} />
      <div className={styles.avatar} title={name}>
        {getInitials(name)}
      </div>
      <button
        className={styles.logoutButton}
        onClick={handleLogout}
        aria-label="Sign out"
        title="Sign out"
      >
        <i className="ph-bold ph-sign-out" />
      </button>
    </div>
  );
}

import styles from "./UserProfile.module.scss";

interface UserProfileProps {
  initials: string;
}

export default function UserProfile({ initials }: UserProfileProps) {
  return (
    <div className={styles.userProfile}>
      <i className={`ph-bold ph-bell ${styles.bellIcon}`} />
      <div className={styles.avatar}>{initials}</div>
    </div>
  );
}

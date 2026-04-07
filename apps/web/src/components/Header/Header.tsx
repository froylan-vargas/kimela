import Logo from "./Logo";
import KimelaSelector from "./KimelaSelector/KimelaSelector";
import UserProfile from "./UserProfile";
import styles from "./Header.module.scss";

export default function Header() {
  return (
    <header className={styles.navbar}>
      <Logo />
      <KimelaSelector />
      <UserProfile initials="FV" />
    </header>
  );
}

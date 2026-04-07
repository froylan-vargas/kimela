import styles from "./Logo.module.scss";

export default function Logo() {
  return (
    <div className={styles.logo}>
      <i className={`ph-bold ph-trophy ${styles.icon}`} />
    </div>
  );
}

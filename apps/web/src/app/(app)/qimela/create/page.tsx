import BackButton from "./BackButton";
import CreateQimelaForm from "@/components/qimela/CreateQimelaForm/CreateQimelaForm";
import styles from "./page.module.scss";

export default function NuevaQimelaPage() {
  return (
    <main className={styles.page}>
      <BackButton />
      <h1 className={styles.title}>Es momento de crear tu qimela.</h1>
      <CreateQimelaForm />
    </main>
  );
}

"use client";

import { useEffect, useRef } from "react";
import styles from "./QimelaRulesModal.module.scss";

interface QimelaRulesModalProps {
  open: boolean;
  onClose: () => void;
}

export default function QimelaRulesModal({
  open,
  onClose,
}: QimelaRulesModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open && typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    } else if (dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="qimela-rules-title"
      onClick={handleBackdropClick}
    >
      <div className={styles.modal}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Mundial 2026</span>
            <h2 id="qimela-rules-title">Reglas de la qimela</h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Cerrar reglas"
            onClick={onClose}
          >
            x
          </button>
        </header>

        <div className={styles.content}>
          <ol className={styles.rulesList}>
            <li>
              Las suscripciones a la qimela <strong>Mundial 2026</strong>{" "}
              comenzarán el <strong>4 de junio de 2026</strong>.
            </li>
            <li>
              El costo de inscripción será de <strong>$200 MXN</strong>. El
              depósito deberá realizarse a la cuenta Santander con CLABE{" "}
              <strong>014180567197351273</strong>. Después de depositar, envía
              una captura de pantalla del comprobante por WhatsApp al{" "}
              <strong>5532023436</strong>.
            </li>
            <li>
              Cada jugador podrá llenar sus pronósticos inmediatamente después
              de suscribirse.
            </li>
            <li>
              Podrás pronosticar un partido hasta 3 minutos antes de su inicio.
              Cuando falten 2:59 minutos o menos, el partido quedará bloqueado
              y ya no podrás sumar puntos en ese encuentro si no registraste tu
              pronóstico.
            </li>
            <li>
              Ganas 1 punto si aciertas el equipo ganador o el empate.
              <div className={styles.examples}>
                <p>
                  Marcador oficial: 2-0. Tu marcador: 3-0. Ganas 1 punto.
                </p>
                <p>
                  Marcador oficial: 3-3. Tu marcador: 1-1. Ganas 1 punto.
                </p>
                <p>
                  Marcador oficial: 2-0. Tu marcador: 1-2. Ganas 0 puntos.
                </p>
              </div>
            </li>
            <li>
              Ganas 1 punto adicional si aciertas el marcador exacto del
              partido.
              <div className={styles.examples}>
                <p>
                  Marcador oficial: 2-0. Tu marcador: 2-0. Ganas 2 puntos: 1
                  por la predicción y 1 por el marcador exacto.
                </p>
              </div>
            </li>
            <li>El jugador con más puntos al final del mundial gana.</li>
            <li>
              Criterios de desempate:
              <ol className={styles.subList} type="a">
                <li>Mayor cantidad de aciertos en marcadores exactos.</li>
                <li>Mayor cantidad de aciertos en las rondas finales.</li>
                <li>
                  Si todavía existe posibilidad de empate en la final del
                  mundial, se preguntará a los participantes empatados en qué
                  minuto será la primera tarjeta amarilla del partido. Quien más
                  se acerque ganará el desempate.
                </li>
              </ol>
            </li>
            <li>
              Premios:
              <ol className={styles.subList} type="a">
                <li>
                  Se reparte el 100% de la bolsa acumulada. Por ejemplo, si hay
                  20 jugadores, la bolsa será de 20 x $200.
                </li>
                <li>
                  El ganador de la qimela se llevará el 90% de la bolsa
                  acumulada.
                </li>
                <li>
                  El último lugar de la qimela ganará el 10% de la bolsa
                  acumulada.
                </li>
              </ol>
            </li>
          </ol>
        </div>
      </div>
    </dialog>
  );
}

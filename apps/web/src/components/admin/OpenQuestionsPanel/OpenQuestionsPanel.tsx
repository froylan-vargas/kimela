"use client";

import { FormEvent, useState } from "react";
import {
  useAdminOpenQuestions,
  useCreateOpenQuestion,
  useHideOpenQuestion,
  useShowOpenQuestion,
} from "@/hooks/useOpenQuestions";
import { useToast } from "@/context/ToastContext";
import { toUserMessage } from "@/lib/errors";
import styles from "./OpenQuestionsPanel.module.scss";

interface OpenQuestionsPanelProps {
  eventId: string;
}

export default function OpenQuestionsPanel({ eventId }: OpenQuestionsPanelProps) {
  const [prompt, setPrompt] = useState("");
  const { toast } = useToast();
  const { data: questions, isLoading, isError } = useAdminOpenQuestions(eventId);
  const createQuestion = useCreateOpenQuestion(eventId);
  const showQuestion = useShowOpenQuestion(eventId);
  const hideQuestion = useHideOpenQuestion(eventId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = prompt.trim();
    if (value.length < 5) {
      toast("La pregunta debe tener al menos 5 caracteres.", "error");
      return;
    }

    try {
      await createQuestion.mutateAsync(value);
      setPrompt("");
      toast("Pregunta guardada correctamente.", "success");
    } catch (err) {
      toast(toUserMessage(err), "error");
    }
  }

  async function handleShow(questionId: string) {
    try {
      await showQuestion.mutateAsync(questionId);
      toast("Pregunta visible para los usuarios.", "success");
    } catch (err) {
      toast(toUserMessage(err), "error");
    }
  }

  async function handleHide(questionId: string) {
    try {
      await hideQuestion.mutateAsync(questionId);
      toast("Pregunta oculta para los usuarios.", "success");
    } catch (err) {
      toast(toUserMessage(err), "error");
    }
  }

  return (
    <section className={styles.section} aria-labelledby="open-questions-title">
      <div className={styles.header}>
        <h2 id="open-questions-title" className={styles.title}>
          Preguntas abiertas
        </h2>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <textarea
          className={styles.textarea}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          maxLength={500}
          placeholder="Escribe una pregunta"
          rows={3}
        />
        <button
          type="submit"
          className={styles.saveButton}
          disabled={createQuestion.isPending}
        >
          {createQuestion.isPending ? "Guardando..." : "Guardar pregunta"}
        </button>
      </form>

      {isLoading && <p className={styles.state}>Cargando preguntas...</p>}
      {isError && <p className={styles.state}>Error al cargar las preguntas.</p>}
      {!isLoading && !isError && questions?.length === 0 && (
        <p className={styles.state}>Aún no hay preguntas abiertas para este evento.</p>
      )}

      {questions && questions.length > 0 && (
        <div className={styles.list}>
          {questions.map((question) => {
            const isPending =
              (showQuestion.isPending && showQuestion.variables === question.id) ||
              (hideQuestion.isPending && hideQuestion.variables === question.id);
            return (
              <article key={question.id} className={styles.item}>
                <div className={styles.itemBody}>
                  <p className={styles.prompt}>{question.prompt}</p>
                  <div className={styles.meta}>
                    <span className={styles.status}>
                      {question.status === "VISIBLE" ? "Visible" : "Oculta"}
                    </span>
                    <span>{question.responseCount} respuestas</span>
                  </div>
                </div>
                <div className={styles.actions}>
                  {question.status === "HIDDEN" ? (
                    <button
                      type="button"
                      className={styles.actionButton}
                      disabled={isPending}
                      onClick={() => handleShow(question.id)}
                    >
                      Mostrar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.actionButton}
                      disabled={isPending}
                      onClick={() => handleHide(question.id)}
                    >
                      Ocultar
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

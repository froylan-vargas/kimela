"use client";

import { FormEvent, useState } from "react";
import { useAnswerOpenQuestion, useQimelaOpenQuestions } from "@/hooks/useOpenQuestions";
import { useToast } from "@/context/ToastContext";
import { toUserMessage } from "@/lib/errors";
import styles from "./OpenQuestionsCard.module.scss";

interface OpenQuestionsCardProps {
  qimelaId: string;
}

export default function OpenQuestionsCard({ qimelaId }: OpenQuestionsCardProps) {
  const { data: questions, isLoading, isError } = useQimelaOpenQuestions(qimelaId);
  const answerQuestion = useAnswerOpenQuestion(qimelaId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const { toast } = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>, questionId: string) {
    event.preventDefault();
    const answer = (answers[questionId] ?? "").trim();
    if (!answer) {
      toast("Escribe una respuesta antes de enviarla.", "error");
      return;
    }

    try {
      await answerQuestion.mutateAsync({ questionId, answer });
      setAnswers((prev) => ({ ...prev, [questionId]: "" }));
      toast("Respuesta enviada.", "success");
    } catch (err) {
      toast(toUserMessage(err), "error");
    }
  }

  if (!isLoading && !isError && (!questions || questions.length === 0)) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby="qimela-open-questions-title">
      <div className={styles.header}>
        <h2 id="qimela-open-questions-title" className={styles.title}>
          Preguntas
        </h2>
      </div>

      {isLoading && <div className={styles.state}>Cargando preguntas...</div>}
      {isError && <div className={styles.state}>No se pudieron cargar las preguntas.</div>}

      {questions && questions.length > 0 && (
        <div className={styles.list}>
          {questions.map((question) => {
            const isPending =
              answerQuestion.isPending &&
              answerQuestion.variables?.questionId === question.id;

            return (
              <article key={question.id} className={styles.item}>
                <p className={styles.prompt}>{question.prompt}</p>

                {question.answered && question.answer ? (
                  <div className={styles.answerBox}>
                    <span className={styles.answerLabel}>Respuesta enviada</span>
                    <p>{question.answer.answer}</p>
                  </div>
                ) : (
                  <form
                    className={styles.form}
                    onSubmit={(event) => handleSubmit(event, question.id)}
                  >
                    <textarea
                      className={styles.textarea}
                      value={answers[question.id] ?? ""}
                      onChange={(event) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [question.id]: event.target.value,
                        }))
                      }
                      rows={3}
                      maxLength={1000}
                      placeholder="Escribe tu respuesta"
                    />
                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={isPending}
                    >
                      {isPending ? "Enviando..." : "Responder"}
                    </button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

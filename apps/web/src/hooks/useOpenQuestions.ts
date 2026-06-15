import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, qimelasApi } from "@/lib/apiClient";
import type { AdminOpenQuestion, QimelaOpenQuestion } from "@/types/openQuestion";

export function useAdminOpenQuestions(eventId: string) {
  return useQuery<AdminOpenQuestion[], Error>({
    queryKey: ["admin", "openQuestions", eventId],
    queryFn: async () => {
      const res = await adminApi.getOpenQuestions(eventId);
      return res.data;
    },
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateOpenQuestion(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prompt: string) => {
      const res = await adminApi.createOpenQuestion(eventId, { prompt });
      return res.data;
    },
    onSuccess: (question) => {
      queryClient.setQueryData<AdminOpenQuestion[]>(
        ["admin", "openQuestions", eventId],
        (prev) => [...(prev ?? []), question],
      );
    },
  });
}

export function useShowOpenQuestion(eventId: string) {
  return useSetAdminOpenQuestionVisibility(eventId, "show");
}

export function useHideOpenQuestion(eventId: string) {
  return useSetAdminOpenQuestionVisibility(eventId, "hide");
}

function useSetAdminOpenQuestionVisibility(eventId: string, action: "show" | "hide") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionId: string) => {
      const res =
        action === "show"
          ? await adminApi.showOpenQuestion(eventId, questionId)
          : await adminApi.hideOpenQuestion(eventId, questionId);
      return res.data;
    },
    onSuccess: (question) => {
      queryClient.setQueryData<AdminOpenQuestion[]>(
        ["admin", "openQuestions", eventId],
        (prev) => (prev ?? []).map((item) => (item.id === question.id ? question : item)),
      );
    },
  });
}

export function useQimelaOpenQuestions(qimelaId: string) {
  return useQuery<QimelaOpenQuestion[], Error>({
    queryKey: ["qimela", qimelaId, "openQuestions"],
    queryFn: async () => {
      const res = await qimelasApi.getOpenQuestions(qimelaId);
      return res.data;
    },
    enabled: !!qimelaId,
    staleTime: 1000 * 60,
  });
}

export function useAnswerOpenQuestion(qimelaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      const res = await qimelasApi.answerOpenQuestion(qimelaId, questionId, { answer });
      return res.data;
    },
    onSuccess: (question) => {
      queryClient.setQueryData<QimelaOpenQuestion[]>(
        ["qimela", qimelaId, "openQuestions"],
        (prev) => (prev ?? []).map((item) => (item.id === question.id ? question : item)),
      );
    },
  });
}

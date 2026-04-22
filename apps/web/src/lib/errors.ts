import { ApiError } from "@/lib/apiClient";

const DOMAIN_STATUSES = [403, 409, 410, 422];

const CODE_MESSAGES: Record<string, string> = {
  PHASE_MUST_BE_UPCOMING_FOR_UPLOAD:
    "Solo se pueden cargar sesiones a una fase que no ha comenzado.",
  RULE_BELOW_MIN_POINTS:
    "Uno de los valores ingresados está por debajo del mínimo permitido.",
  RULE_ABOVE_MAX_POINTS:
    "Uno de los valores ingresados supera el máximo permitido.",
  QIMELA_COMPLETED_UNEDITABLE: "No se puede editar una qimela completada.",
  PICKS_DEADLINE_PASSED:
    "No puedes registrar pronósticos para partidos que comienzan en menos de 3 minutos.",
  PICKS_SESSION_NOT_OPEN:
    "Solo puedes registrar pronósticos en sesiones programadas.",
  PICK_CATEGORY_NOT_IN_SESSION:
    "La categoría de pronóstico no pertenece a esta sesión.",
};

export function toUserMessage(err: unknown): string {
  if (err instanceof ApiError) {
    console.error("[toUserMessage] ApiError", {
      status: err.status,
      code: err.code,
      message: err.message,
    });
    if (err.code && CODE_MESSAGES[err.code]) return CODE_MESSAGES[err.code];
    if (DOMAIN_STATUSES.includes(err.status)) return err.message;
    if (err.status >= 500) return "Algo salió mal. Intenta de nuevo.";
    return "Datos inválidos. Intenta de nuevo.";
  }
  console.error("[toUserMessage] Unknown error", err);
  return "Sin conexión. Verifica tu red.";
}

import type { AuthUser } from "@/types/auth";
import type { Sport } from "@/types/sport";
import type { SportEvent } from "@/types/event";
import type { QimelaEvent, QimelaDetail, Rule, CreateQimelaBody, UpdateQimelaBody } from "@/types/qimela";
import type { Phase, CreatePhaseBody, ReorderPhaseEntry } from "@/types/phase";
import type { Session } from "@/types/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/me",
];

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(res: Response): Promise<{ message: string; code?: string }> {
  try {
    const body = await res.json();
    const nestedMessage =
      body && typeof body.message === "object" && body.message !== null
        ? body.message
        : null;

    const messageSource = nestedMessage?.message ?? body.message;
    const message = Array.isArray(messageSource)
      ? messageSource.join(", ")
      : (typeof messageSource === "string" ? messageSource : res.statusText);

    const code =
      typeof body.code === "string"
        ? body.code
        : (typeof nestedMessage?.code === "string" ? nestedMessage.code : undefined);

    return { message, code };
  } catch {
    return { message: res.statusText };
  }
}

let isRefreshing = false;

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => path.startsWith(ep));

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  if (res.status === 401 && !isAuthEndpoint && !isRefreshing) {
    isRefreshing = true;
    try {
      await authApi.refresh();
      isRefreshing = false;
    } catch {
      isRefreshing = false;
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiError(401, "Session expired");
    }

    // Retry the original request once after refresh
    const retryRes = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (retryRes.ok) {
      if (retryRes.status === 204) return undefined as T;
      return retryRes.json() as Promise<T>;
    }

    const retryErr = await parseError(retryRes);
    throw new ApiError(retryRes.status, retryErr.message, retryErr.code);
  }

  const err = await parseError(res);
  throw new ApiError(res.status, err.message, err.code);
}

export const authApi = {
  me(): Promise<AuthUser> {
    return apiFetch<AuthUser>("/auth/me");
  },

  login(body: { email: string; password: string }): Promise<AuthUser> {
    return apiFetch<AuthUser>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  register(body: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthUser> {
    return apiFetch<AuthUser>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  logout(): Promise<void> {
    return apiFetch<void>("/auth/logout", { method: "POST" });
  },

  refresh(): Promise<void> {
    return apiFetch<void>("/auth/refresh", { method: "POST" });
  },

  confirmEmail(token: string): Promise<void> {
    return apiFetch<void>("/auth/confirm-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  resendVerification(email: string): Promise<void> {
    return apiFetch<void>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  forgotPassword(email: string): Promise<void> {
    return apiFetch<void>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token: string, password: string): Promise<void> {
    return apiFetch<void>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  },
};

export const sportsApi = {
  list(): Promise<{ data: Sport[] }> {
    return apiFetch<{ data: Sport[] }>("/admin/sports");
  },
};

export const qimelasApi = {
  getSports(): Promise<{ data: Sport[] }> {
    return apiFetch<{ data: Sport[] }>("/qimelas/sports");
  },

  getEvents(sportId: string): Promise<{ data: QimelaEvent[] }> {
    return apiFetch<{ data: QimelaEvent[] }>(
      `/qimelas/sports/${encodeURIComponent(sportId)}/events`,
    );
  },

  getRules(): Promise<{ data: Rule[] }> {
    return apiFetch<{ data: Rule[] }>("/qimelas/rules");
  },

  create(body: CreateQimelaBody): Promise<{ data: { id: string; name: string } }> {
    return apiFetch<{ data: { id: string; name: string } }>("/qimelas", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getById(id: string): Promise<{ data: QimelaDetail }> {
    return apiFetch(`/qimelas/${encodeURIComponent(id)}`);
  },

  update(id: string, body: UpdateQimelaBody): Promise<{ data: { id: string; name: string; status: string; startPhaseId: string | null; endPhaseId: string | null; rules?: { id: string; ruleId: string; points: number }[] } }> {
    return apiFetch(`/qimelas/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
};

export const inviteApi = {
  getByToken(token: string): Promise<{ data: { qimelaId: string; name: string; status: string; sport: { id: string; name: string }; creator: { name: string } } }> {
    return apiFetch(`/invite/${encodeURIComponent(token)}`);
  },

  subscribe(token: string): Promise<void> {
    return apiFetch<void>(`/invite/${encodeURIComponent(token)}/subscribe`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  generate(qimelaId: string): Promise<{ data: { token: string } }> {
    return apiFetch<{ data: { token: string } }>(
      `/qimelas/${encodeURIComponent(qimelaId)}/invite`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },

  revoke(qimelaId: string): Promise<void> {
    return apiFetch<void>(
      `/qimelas/${encodeURIComponent(qimelaId)}/invite`,
      { method: "DELETE" },
    );
  },
};

export const adminApi = {
  listEvents(sportId: string): Promise<{ data: SportEvent[] }> {
    return apiFetch<{ data: SportEvent[] }>(
      `/admin/events?sportId=${encodeURIComponent(sportId)}`,
    );
  },

  getPhases(eventId: string): Promise<{ data: Phase[] }> {
    return apiFetch<{ data: Phase[] }>(`/admin/events/${encodeURIComponent(eventId)}/phases`);
  },

  createPhase(eventId: string, body: CreatePhaseBody): Promise<{ data: Phase }> {
    return apiFetch<{ data: Phase }>(`/admin/events/${encodeURIComponent(eventId)}/phases`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  reorderPhases(eventId: string, phases: ReorderPhaseEntry[]): Promise<void> {
    return apiFetch<void>(`/admin/events/${encodeURIComponent(eventId)}/phases/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ phases }),
    });
  },

  deletePhase(eventId: string, phaseId: string): Promise<void> {
    return apiFetch<void>(
      `/admin/events/${encodeURIComponent(eventId)}/phases/${encodeURIComponent(phaseId)}`,
      { method: "DELETE" },
    );
  },

  getSessions(eventId: string, phaseId: string): Promise<{ data: Session[] }> {
    return apiFetch<{ data: Session[] }>(
      `/admin/events/${encodeURIComponent(eventId)}/phases/${encodeURIComponent(phaseId)}/sessions`,
    );
  },

  activatePhase(eventId: string, phaseId: string): Promise<{ data: Phase }> {
    return apiFetch<{ data: Phase }>(
      `/admin/events/${encodeURIComponent(eventId)}/phases/${encodeURIComponent(phaseId)}/activate`,
      { method: "PATCH", body: JSON.stringify({}) },
    );
  },

  completePhase(eventId: string, phaseId: string): Promise<{ data: Phase }> {
    return apiFetch<{ data: Phase }>(
      `/admin/events/${encodeURIComponent(eventId)}/phases/${encodeURIComponent(phaseId)}/complete`,
      { method: "PATCH", body: JSON.stringify({}) },
    );
  },

  async uploadSessions(
    eventId: string,
    phaseId: string,
    file: File,
  ): Promise<{ data: Session[] }> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${API_URL}/admin/events/${encodeURIComponent(eventId)}/phases/${encodeURIComponent(phaseId)}/sessions/upload`;

    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      body: formData,
      // Do NOT set Content-Type — browser sets it with boundary
    });

    if (res.ok) {
      return res.json() as Promise<{ data: Session[] }>;
    }

    if (res.status === 401) {
      try {
        await authApi.refresh();
      } catch {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new ApiError(401, "Session expired");
      }

      const retryRes = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (retryRes.ok) {
        return retryRes.json() as Promise<{ data: Session[] }>;
      }

      const retryErr = await parseError(retryRes);
      throw new ApiError(retryRes.status, retryErr.message, retryErr.code);
    }

    const err = await parseError(res);
    throw new ApiError(res.status, err.message, err.code);
  },
};

import type { AuthUser } from "@/types/auth";
import type { Sport } from "@/types/sport";
import type { SportEvent } from "@/types/event";
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

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }
    return body.message ?? res.statusText;
  } catch {
    return res.statusText;
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

    const retryMsg = await parseErrorMessage(retryRes);
    throw new ApiError(retryRes.status, retryMsg);
  }

  const message = await parseErrorMessage(res);
  throw new ApiError(res.status, message);
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

  resendVerification(): Promise<void> {
    return apiFetch<void>("/auth/resend-verification", { method: "POST" });
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

      const retryMsg = await parseErrorMessage(retryRes);
      throw new ApiError(retryRes.status, retryMsg);
    }

    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  },
};

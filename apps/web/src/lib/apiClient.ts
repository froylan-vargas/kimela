import type { AuthUser } from "@/types/auth";
import type { Sport } from "@/types/sport";
import type { SportEvent } from "@/types/event";
import type { QimelaEvent, QimelaDetail, Rule, CreateQimelaBody, UpdateQimelaBody } from "@/types/qimela";
import type { Phase, CreatePhaseBody, ReorderPhaseEntry } from "@/types/phase";
import type { Session } from "@/types/session";
import type { PhaseSessionsGroup, SavePredictionPickInput } from "@/types/prediction";

export interface QimelaLabel {
  id: string;
  name: string;
  color: string;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalPoints: number;
  correctPicksCount: number;
  exactResultsCount: number;
  rank: number;
  imageUrl: string | null;
}

export type QimelaPhaseStatus = "COMPLETED" | "ACTIVE";

export interface QimelaPhase {
  id: string;
  name: string;
  order: number;
  status: QimelaPhaseStatus;
}

export interface ComparisonContender {
  id: string;
  name: string;
  imgUrl: string | null;
}

export interface ComparisonUserResult {
  userId: string;
  userName: string;
  homePick: string | null;
  awayPick: string | null;
  points: number | null;
}

export interface ComparisonSession {
  id: string;
  name: string;
  scheduledAt: string;
  phaseId: string;
  phaseName: string;
  home: ComparisonContender;
  away: ComparisonContender;
  actualResult: {
    homeScore: string | null;
    awayScore: string | null;
  };
  users: ComparisonUserResult[];
}

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

let refreshPromise: Promise<void> | null = null;

function ensureRefreshed(): Promise<void> {
  // Coalesce concurrent refresh attempts onto a single in-flight request,
  // so token rotation can't race itself across parallel queries.
  if (!refreshPromise) {
    refreshPromise = authApi.refresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function tryRefreshOrRedirect(): Promise<void> {
  try {
    await ensureRefreshed();
  } catch {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Session expired");
  }
}

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

  if (res.status === 401 && !isAuthEndpoint) {
    await tryRefreshOrRedirect();

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

  getUpcomingSessions(qimelaId: string): Promise<{ data: PhaseSessionsGroup[] }> {
    return apiFetch<{ data: PhaseSessionsGroup[] }>(
      `/qimelas/${encodeURIComponent(qimelaId)}/sessions/upcoming`
    );
  },

  getAllSessions(qimelaId: string): Promise<{ data: PhaseSessionsGroup[] }> {
    return apiFetch<{ data: PhaseSessionsGroup[] }>(
      `/qimelas/${encodeURIComponent(qimelaId)}/sessions`
    );
  },

  getLeaderboard(qimelaId: string, phaseId?: string): Promise<{ data: LeaderboardEntry[] }> {
    const url = phaseId
      ? `/qimelas/${encodeURIComponent(qimelaId)}/leaderboard?phaseId=${encodeURIComponent(phaseId)}`
      : `/qimelas/${encodeURIComponent(qimelaId)}/leaderboard`;
    return apiFetch<{ data: LeaderboardEntry[] }>(url);
  },

  getPhases(qimelaId: string): Promise<{ data: QimelaPhase[] }> {
    return apiFetch<{ data: QimelaPhase[] }>(
      `/qimelas/${encodeURIComponent(qimelaId)}/phases`,
    );
  },

  getResults(
    qimelaId: string,
    phaseId: string,
    compareUserIds: string[],
  ): Promise<{ data: ComparisonSession[] }> {
    const params = new URLSearchParams({ phaseId });
    if (compareUserIds.length > 0) {
      params.set("userIds", compareUserIds.join(","));
    }
    return apiFetch<{ data: ComparisonSession[] }>(
      `/qimelas/${encodeURIComponent(qimelaId)}/results?${params.toString()}`,
    );
  },

  subscribe(qimelaId: string): Promise<{ data: { subscriptionId: string } }> {
    return apiFetch<{ data: { subscriptionId: string } }>(
      `/qimelas/${encodeURIComponent(qimelaId)}/subscribe`,
      { method: "POST" },
    );
  },

  getSubscribers(
    qimelaId: string,
    params: { page: number; limit: number; search?: string },
  ): Promise<{ data: { subscribers: { userId: string; name: string; email: string; labels: QimelaLabel[] }[]; total: number; page: number; limit: number } }> {
    const qs = new URLSearchParams({
      page: String(params.page),
      limit: String(params.limit),
    });
    if (params.search) qs.set("search", params.search);
    return apiFetch(`/qimelas/${encodeURIComponent(qimelaId)}/subscribers?${qs.toString()}`);
  },

  removeSubscriber(qimelaId: string, userId: string): Promise<{ data: { removed: boolean } }> {
    return apiFetch(
      `/qimelas/${encodeURIComponent(qimelaId)}/subscribers/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    );
  },

  getLabels(qimelaId: string): Promise<{ data: { labels: QimelaLabel[] } }> {
    return apiFetch(`/qimelas/${encodeURIComponent(qimelaId)}/labels`);
  },

  createLabel(qimelaId: string, body: { name: string; color: string }): Promise<{ data: QimelaLabel }> {
    return apiFetch(`/qimelas/${encodeURIComponent(qimelaId)}/labels`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  deleteLabel(qimelaId: string, labelId: string): Promise<{ data: { deleted: boolean } }> {
    return apiFetch(
      `/qimelas/${encodeURIComponent(qimelaId)}/labels/${encodeURIComponent(labelId)}`,
      { method: "DELETE" },
    );
  },

  applyLabel(qimelaId: string, userId: string, labelId: string): Promise<{ data: { applied: boolean } }> {
    return apiFetch(
      `/qimelas/${encodeURIComponent(qimelaId)}/subscribers/${encodeURIComponent(userId)}/labels/${encodeURIComponent(labelId)}`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },

  removeLabel(qimelaId: string, userId: string, labelId: string): Promise<{ data: { removed: boolean } }> {
    return apiFetch(
      `/qimelas/${encodeURIComponent(qimelaId)}/subscribers/${encodeURIComponent(userId)}/labels/${encodeURIComponent(labelId)}`,
      { method: "DELETE" },
    );
  },

  saveSessionPicks(
    qimelaId: string,
    sessionId: string,
    picks: SavePredictionPickInput[],
  ): Promise<{ data: { sessionId: string; picks: SavePredictionPickInput[] } }> {
    return apiFetch<{ data: { sessionId: string; picks: SavePredictionPickInput[] } }>(
      `/qimelas/${encodeURIComponent(qimelaId)}/sessions/${encodeURIComponent(sessionId)}/picks`,
      {
        method: "POST",
        body: JSON.stringify({ picks }),
      },
    );
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

export const usersApi = {
  updateProfile(name: string): Promise<AuthUser> {
    return apiFetch<AuthUser>("/users/me/profile", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  },

  async uploadAvatar(file: File): Promise<AuthUser> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${API_URL}/users/me/avatar`;
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (res.ok) return res.json() as Promise<AuthUser>;

    if (res.status === 401) {
      await tryRefreshOrRedirect();
      const retry = await fetch(url, { method: "POST", credentials: "include", body: formData });
      if (retry.ok) return retry.json() as Promise<AuthUser>;
      const retryErr = await parseError(retry);
      throw new ApiError(retry.status, retryErr.message, retryErr.code);
    }

    const err = await parseError(res);
    throw new ApiError(res.status, err.message, err.code);
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

  saveSessionResults(
    eventId: string,
    phaseId: string,
    sessionId: string,
    homeScore: string,
    awayScore: string,
  ): Promise<void> {
    return apiFetch<void>(
      `/admin/events/${encodeURIComponent(eventId)}/phases/${encodeURIComponent(phaseId)}/sessions/${encodeURIComponent(sessionId)}/results`,
      {
        method: "PUT",
        body: JSON.stringify({ homeScore, awayScore }),
      },
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
      await tryRefreshOrRedirect();

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

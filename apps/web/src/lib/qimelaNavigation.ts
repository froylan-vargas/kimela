import type { AuthUser } from "@/types/auth";
import type { qimela, QimelaRole, QimelasResponse } from "@/types/qimela";

export interface QimelaNavigationTarget {
  href: string;
  qimela: qimela | null;
  viewAs: QimelaRole | null;
}

function byNewestCreatedAt(a: qimela, b: qimela): number {
  const aTime = Date.parse(a.createdAt ?? "") || 0;
  const bTime = Date.parse(b.createdAt ?? "") || 0;
  return bTime - aTime;
}

function newestByRole(qimelas: qimela[], role: QimelaRole): qimela | null {
  return qimelas
    .filter((qimela) => qimela.role === role)
    .sort(byNewestCreatedAt)[0] ?? null;
}

export function resolveQimelaLandingTarget(
  user: AuthUser | null,
  response: QimelasResponse | undefined,
): QimelaNavigationTarget {
  if (user?.role === "ADMIN") {
    return { href: "/admin/events", qimela: null, viewAs: null };
  }

  const qimelas = response?.data ?? [];
  const subscriberQimela = newestByRole(qimelas, "SUBSCRIBER");

  if (subscriberQimela) {
    return {
      href: "/dashboard",
      qimela: subscriberQimela,
      viewAs: "SUBSCRIBER",
    };
  }

  const creatorQimela = newestByRole(qimelas, "CREATOR");

  if (creatorQimela) {
    return {
      href: `/qimela/${creatorQimela.id}`,
      qimela: creatorQimela,
      viewAs: "CREATOR",
    };
  }

  return { href: "/dashboard", qimela: null, viewAs: null };
}

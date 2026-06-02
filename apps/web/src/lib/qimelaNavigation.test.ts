import { describe, expect, it } from "vitest";
import { resolveQimelaLandingTarget } from "./qimelaNavigation";
import type { AuthUser } from "@/types/auth";
import type { QimelasResponse } from "@/types/qimela";

const user: AuthUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  role: "USER",
  emailVerifiedAt: null,
  imageUrl: null,
};

function response(data: QimelasResponse["data"]): QimelasResponse {
  return {
    data,
    meta: { total: data.length, page: 1, limit: 10 },
  };
}

describe("resolveQimelaLandingTarget", () => {
  it("prefers the newest subscribed qimela", () => {
    const target = resolveQimelaLandingTarget(
      user,
      response([
        {
          id: "q-old",
          name: "Vieja",
          sportId: "sport-1",
          status: "ACTIVE",
          role: "SUBSCRIBER",
          creatorId: "creator-1",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "q-new",
          name: "Nueva",
          sportId: "sport-1",
          status: "ACTIVE",
          role: "SUBSCRIBER",
          creatorId: "creator-1",
          createdAt: "2026-02-01T00:00:00.000Z",
        },
      ]),
    );

    expect(target).toMatchObject({
      href: "/dashboard",
      qimela: { id: "q-new" },
      viewAs: "SUBSCRIBER",
    });
  });

  it("uses the newest creator qimela when there are no subscriptions", () => {
    const target = resolveQimelaLandingTarget(
      user,
      response([
        {
          id: "q-created",
          name: "Creada",
          sportId: "sport-1",
          status: "ACTIVE",
          role: "CREATOR",
          creatorId: "user-1",
          createdAt: "2026-02-01T00:00:00.000Z",
        },
      ]),
    );

    expect(target).toMatchObject({
      href: "/qimela/q-created",
      qimela: { id: "q-created" },
      viewAs: "CREATOR",
    });
  });

  it("does not apply user qimela landing rules to admins", () => {
    const target = resolveQimelaLandingTarget(
      { ...user, role: "ADMIN" },
      response([]),
    );

    expect(target).toEqual({
      href: "/admin/events",
      qimela: null,
      viewAs: null,
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiClient";

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts nested Nest exception codes from auth responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 401,
          message: {
            message: "Email not verified",
            code: "EMAIL_NOT_VERIFIED",
          },
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
          statusText: "Unauthorized",
        }
      )
    );

    await expect(
      apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "pending@example.com", password: "Password1!" }),
      })
    ).rejects.toMatchObject({
      status: 401,
      message: "Email not verified",
      code: "EMAIL_NOT_VERIFIED",
    });
  });
});

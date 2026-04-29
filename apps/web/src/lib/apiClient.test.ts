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

  it("refreshes and retries /auth/me after an expired access token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
          statusText: "Unauthorized",
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "user-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "user-1", email: "test@example.com" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    await expect(apiFetch("/auth/me")).resolves.toMatchObject({
      id: "user-1",
      email: "test@example.com",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/auth/me",
      expect.objectContaining({ credentials: "include" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3000/auth/me",
      expect.objectContaining({ credentials: "include" })
    );
  });
});

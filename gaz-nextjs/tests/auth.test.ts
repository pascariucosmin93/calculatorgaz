import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn()
    }
  }
}));

import prisma from "@/lib/prisma";
import { isErrorResponse, verifySession } from "../lib/auth";

function makeRequestWithCookie(cookie?: string) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", `gaz-session=${cookie}`);
  return new NextRequest(new URL("https://example.com/api/whatever"), { headers });
}

describe("verifySession", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returnează 401 dacă lipsește cookie-ul de sesiune", async () => {
    const result = await verifySession(makeRequestWithCookie());
    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) expect(result.status).toBe(401);
  });

  it("returnează 401 dacă session-service respinge tokenul", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    const result = await verifySession(makeRequestWithCookie("tok"));
    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) expect(result.status).toBe(401);
  });

  it("returnează 502 dacă session-service e indisponibil", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;

    const result = await verifySession(makeRequestWithCookie("tok"));
    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) expect(result.status).toBe(502);
  });

  it("returnează 401 dacă tokenVersion din token nu mai coincide cu DB (sesiune revocată)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "u1", username: "ana", email: "a@b.com", tokenVersion: 1 })
    }) as unknown as typeof fetch;
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ tokenVersion: 2 } as never);

    const result = await verifySession(makeRequestWithCookie("tok"));
    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) expect(result.status).toBe(401);
  });

  it("returnează 401 dacă userul nu mai există în DB", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "u-sters", username: "ana", email: "a@b.com", tokenVersion: 0 })
    }) as unknown as typeof fetch;
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await verifySession(makeRequestWithCookie("tok"));
    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) expect(result.status).toBe(401);
  });

  it("returnează userul autentificat dacă tokenVersion coincide", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "u1", username: "ana", email: "a@b.com", tokenVersion: 2 })
    }) as unknown as typeof fetch;
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ tokenVersion: 2 } as never);

    const result = await verifySession(makeRequestWithCookie("tok"));
    expect(isErrorResponse(result)).toBe(false);
    if (!isErrorResponse(result)) {
      expect(result.id).toBe("u1");
      expect(result.username).toBe("ana");
    }
  });
});

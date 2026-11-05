import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const BASE_URL = "https://example.com";

async function loadMiddleware() {
  vi.resetModules();
  const mod = await import("../middleware");
  return mod.middleware;
}

function makeRequest(
  path: string,
  init: { method?: string; headers?: Record<string, string> } = {},
  ip = "10.0.0.1"
) {
  const headers = new Headers(init.headers);
  headers.set("x-forwarded-for", ip);
  return new NextRequest(new URL(path, BASE_URL), { method: init.method, headers });
}

describe("middleware — DDoS blocklist (fără agent configurat)", () => {
  afterEach(() => {
    delete process.env.DDOS_BLOCKLIST_URL;
    vi.unstubAllGlobals();
  });

  it("nu face niciun fetch și nu blochează nimic când DDOS_BLOCKLIST_URL nu e setat", async () => {
    delete process.env.DDOS_BLOCKLIST_URL;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const middleware = await loadMiddleware();
    const res = await middleware(makeRequest("/consum", {}, "1.1.1.1"));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.status).not.toBe(403);
  });
});

describe("middleware — CSRF", () => {
  it("respinge un POST fără token CSRF valid pe o rută protejată", async () => {
    const middleware = await loadMiddleware();
    const res = await middleware(makeRequest("/api/readings", { method: "POST" }, "2.2.2.1"));
    expect(res.status).toBe(403);
  });

  it("acceptă un POST cu token CSRF valid (cookie === header, >=32 caractere)", async () => {
    const middleware = await loadMiddleware();
    const token = "a".repeat(32);
    const res = await middleware(
      makeRequest(
        "/api/readings",
        { method: "POST", headers: { "x-csrf-token": token, cookie: `gaz-csrf=${token}` } },
        "2.2.2.2"
      )
    );
    expect(res.status).not.toBe(403);
  });

  it("nu cere token CSRF pe rutele exceptate (ex. login)", async () => {
    const middleware = await loadMiddleware();
    const res = await middleware(makeRequest("/api/auth/login", { method: "POST" }, "2.2.2.3"));
    expect(res.status).not.toBe(403);
  });
});

describe("middleware — rate limiting per-IP", () => {
  it("blochează cu 429 după ce se depășește limita efectivă (redusă pentru 2 replici)", async () => {
    const middleware = await loadMiddleware();
    const ip = "3.3.3.3";
    const csrfToken = "b".repeat(32);
    const request = () =>
      makeRequest(
        "/api/auth/login",
        { method: "POST", headers: { "x-csrf-token": csrfToken, cookie: `gaz-csrf=${csrfToken}` } },
        ip
      );

    // baseRule pentru login: maxRequests=5, RATE_LIMIT_REPLICA_COUNT implicit=2 -> efectiv 2
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      statuses.push((await middleware(request())).status);
    }

    expect(statuses[0]).not.toBe(429);
    expect(statuses[1]).not.toBe(429);
    expect(statuses[2]).toBe(429);
    expect(statuses[3]).toBe(429);
  });

  it("nu amestecă limitele între IP-uri diferite", async () => {
    const middleware = await loadMiddleware();
    const csrfToken = "c".repeat(32);
    const requestFrom = (ip: string) =>
      makeRequest(
        "/api/auth/login",
        { method: "POST", headers: { "x-csrf-token": csrfToken, cookie: `gaz-csrf=${csrfToken}` } },
        ip
      );

    const first = await middleware(requestFrom("4.4.4.1"));
    const second = await middleware(requestFrom("4.4.4.2"));

    expect(first.status).not.toBe(429);
    expect(second.status).not.toBe(429);
  });
});

describe("middleware — rute interne", () => {
  afterEach(() => {
    delete process.env.INTERNAL_API_KEY;
  });

  it("blochează /api/internal/* fără cheia corectă", async () => {
    process.env.INTERNAL_API_KEY = "secret123";
    const middleware = await loadMiddleware();
    const res = await middleware(
      makeRequest("/api/internal/auth/login", { method: "POST" }, "5.5.5.1")
    );
    expect(res.status).toBe(403);
  });

  it("permite /api/internal/* cu cheia corectă", async () => {
    process.env.INTERNAL_API_KEY = "secret123";
    const middleware = await loadMiddleware();
    const res = await middleware(
      makeRequest(
        "/api/internal/auth/login",
        { method: "POST", headers: { "x-internal-api-key": "secret123" } },
        "5.5.5.2"
      )
    );
    expect(res.status).not.toBe(403);
  });
});

import fs from "node:fs/promises";

const BASE_URL = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "admin";
const REPORT_PATH = process.env.SMOKE_REPORT_PATH || "";

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  setFromResponse(response) {
    const raw = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);

    for (const header of raw) {
      const [pair] = header.split(";", 1);
      const idx = pair.indexOf("=");
      if (idx === -1) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      this.cookies.set(name, value);
    }
  }

  header() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  get(name) {
    return this.cookies.get(name) || "";
  }
}

const report = {
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  checks: []
};

async function record(name, fn) {
  const startedAt = Date.now();
  try {
    const details = await fn();
    report.checks.push({
      name,
      status: "passed",
      durationMs: Date.now() - startedAt,
      details
    });
  } catch (error) {
    report.checks.push({
      name,
      status: "failed",
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function fetchJson(path, init = {}, jar) {
  const headers = new Headers(init.headers || {});
  if (jar && jar.header()) {
    headers.set("cookie", jar.header());
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    redirect: "manual"
  });

  if (jar) {
    jar.setFromResponse(response);
  }

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  return { response, text, json };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function writeReport() {
  report.finishedAt = new Date().toISOString();
  report.passed = report.checks.every((check) => check.status === "passed");
  if (REPORT_PATH) {
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  }
}

const adminJar = new CookieJar();

try {
  await record("health", async () => {
    const { response, json } = await fetchJson("/api/health");
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(json?.status === "ok", `Expected status ok, got ${JSON.stringify(json)}`);
    return { status: response.status };
  });

  let csrfToken = "";

  await record("csrf issues cookie and token", async () => {
    const { response, json } = await fetchJson("/api/auth/csrf", {}, adminJar);
    csrfToken = json?.csrfToken || "";
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(csrfToken.length >= 32, "Missing CSRF token in JSON body");
    assert(adminJar.get("gaz-csrf") === csrfToken, "Cookie token does not match JSON token");
    return { status: response.status, cookieNames: Array.from(adminJar.cookies.keys()) };
  });

  await record("admin session rejects unauthenticated request without csrf error", async () => {
    const { response, json } = await fetchJson(
      "/api/admin/session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({ password: ADMIN_PASSWORD })
      },
      adminJar
    );
    assert(response.status === 401, `Expected 401, got ${response.status}`);
    assert(json?.error !== "Token CSRF invalid.", "CSRF validation failed unexpectedly");
    return { status: response.status, error: json?.error };
  });

  await record("admin login", async () => {
    const { response, json } = await fetchJson("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: ADMIN_EMAIL,
        username: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    }, adminJar);

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(json?.email === ADMIN_EMAIL, `Expected ${ADMIN_EMAIL}, got ${json?.email}`);
    assert(json?.isAdmin === true, "Expected login response to mark admin");
    assert(adminJar.get("gaz-session"), "Missing gaz-session cookie after login");
    return { status: response.status };
  });

  await record("auth me", async () => {
    const { response, json } = await fetchJson("/api/auth/me", {}, adminJar);
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(json?.isAdmin === true, "Expected auth/me to mark admin");
    return { status: response.status, username: json?.username };
  });

  await record("admin session opens", async () => {
    const { response, json } = await fetchJson(
      "/api/admin/session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({ password: ADMIN_PASSWORD })
      },
      adminJar
    );

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(json?.ok === true, `Expected ok true, got ${JSON.stringify(json)}`);
    assert(adminJar.get("gaz-admin-session"), "Missing admin session cookie");
    return { status: response.status };
  });

  let createdUserId = "";
  const createdEmail = "smoke-user@example.com";

  await record("admin list users", async () => {
    const { response, json } = await fetchJson(
      "/api/admin/users",
      {
        method: "POST",
        headers: { "x-csrf-token": csrfToken }
      },
      adminJar
    );

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(Array.isArray(json), "Expected users array");
    return { status: response.status, count: json.length };
  });

  await record("admin create user", async () => {
    const { response, json } = await fetchJson(
      "/api/admin/users",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({
          username: "smoke-user",
          email: createdEmail,
          password: "SmokePass123",
          ownerName: "Smoke User",
          address: "Smoke Street 1"
        })
      },
      adminJar
    );

    assert(response.status === 201, `Expected 201, got ${response.status} (${JSON.stringify(json)})`);
    createdUserId = json?.id || "";
    assert(createdUserId, "Missing created user id");
    return { status: response.status, userId: createdUserId };
  });

  await record("user can log in", async () => {
    const userJar = new CookieJar();
    const { response, json } = await fetchJson("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: createdEmail,
        username: createdEmail,
        password: "SmokePass123"
      })
    }, userJar);

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(json?.email === createdEmail, `Expected ${createdEmail}, got ${json?.email}`);
    return { status: response.status };
  });

  await record("admin change user password", async () => {
    const { response, json } = await fetchJson(
      "/api/admin/users",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({
          userId: createdUserId,
          password: "SmokePass456"
        })
      },
      adminJar
    );

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(json?.ok === true, `Expected ok true, got ${JSON.stringify(json)}`);
    return { status: response.status };
  });

  await record("user can log in with updated password", async () => {
    const userJar = new CookieJar();
    const { response } = await fetchJson("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: createdEmail,
        username: createdEmail,
        password: "SmokePass456"
      })
    }, userJar);

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    return { status: response.status };
  });

  await record("admin delete user", async () => {
    const { response, json } = await fetchJson(
      "/api/admin/users",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({
          userId: createdUserId
        })
      },
      adminJar
    );

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(json?.ok === true, `Expected ok true, got ${JSON.stringify(json)}`);
    return { status: response.status };
  });
} finally {
  await writeReport();
}

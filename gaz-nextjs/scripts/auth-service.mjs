import http from "node:http";

const PORT = Number(process.env.PORT || 8083);
const APP_BASE_URL = (process.env.APP_BASE_URL || "http://calculatorgaz").replace(/\/+$/, "");
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });

const writeJson = (res, status, payload) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const proxyJson = async (targetPath, method, payload) => {
  const response = await fetch(`${APP_BASE_URL}${targetPath}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Api-Key": INTERNAL_API_KEY
    },
    body: payload ? JSON.stringify(payload) : undefined
  });

  const text = await response.text();
  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "application/json; charset=utf-8",
    body: text
  };
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return writeJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && req.url === "/auth/signup") {
      const payload = await readJson(req);
      const upstream = await proxyJson("/api/internal/auth/signup", "POST", payload);
      res.writeHead(upstream.status, { "Content-Type": upstream.contentType });
      return res.end(upstream.body);
    }

    if (req.method === "POST" && req.url === "/auth/login") {
      const payload = await readJson(req);
      const upstream = await proxyJson("/api/internal/auth/login", "POST", payload);
      res.writeHead(upstream.status, { "Content-Type": upstream.contentType });
      return res.end(upstream.body);
    }

    if (req.method === "POST" && req.url === "/auth/reset-password") {
      const payload = await readJson(req);
      const upstream = await proxyJson("/api/internal/auth/reset-password", "POST", payload);
      res.writeHead(upstream.status, { "Content-Type": upstream.contentType });
      return res.end(upstream.body);
    }

    if (req.method === "POST" && req.url === "/auth/reset-password/confirm") {
      const payload = await readJson(req);
      const upstream = await proxyJson("/api/internal/auth/reset-password/confirm", "POST", payload);
      res.writeHead(upstream.status, { "Content-Type": upstream.contentType });
      return res.end(upstream.body);
    }

    return writeJson(res, 404, { error: "Not found" });
  } catch (error) {
    return writeJson(res, 502, { error: error instanceof Error ? error.message : "Bad gateway" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`auth-service smoke stub listening on ${PORT}`);
});

import crypto from "node:crypto";
import http from "node:http";

const PORT = Number(process.env.PORT || 8088);
const TOKEN_TTL = Number(process.env.TOKEN_TTL || 86400);
const JWT_SECRET = process.env.JWT_SECRET || "smoke-secret";

const toBase64Url = (buf) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const fromBase64Url = (str) =>
  Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");

const sign = (payload) => {
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const now = Math.floor(Date.now() / 1000);
  const body = toBase64Url(Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + TOKEN_TTL })));
  const signature = toBase64Url(
    crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${signature}`;
};

const verify = (token) => {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const [header, body, signature] = parts;
  const expected = toBase64Url(
    crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest()
  );

  if (signature !== expected) {
    throw new Error("Invalid signature");
  }

  const payload = JSON.parse(fromBase64Url(body).toString("utf8"));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return payload;
};

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 64 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });

const json = (res, status, payload) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return json(res, 200, { ok: true });
    }

    if (req.method === "POST" && req.url === "/session/sign") {
      const payload = await readJson(req);
      return json(res, 200, { token: sign(payload) });
    }

    if (req.method === "POST" && req.url === "/session/verify") {
      const { token } = await readJson(req);
      if (!token) return json(res, 400, { error: "Missing token" });
      return json(res, 200, verify(token));
    }

    return json(res, 404, { error: "Not found" });
  } catch (error) {
    return json(res, 401, { error: error instanceof Error ? error.message : "Unauthorized" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`session-service smoke stub listening on ${PORT}`);
});

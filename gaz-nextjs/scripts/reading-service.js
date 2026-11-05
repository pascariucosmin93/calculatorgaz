const http = require("http");

const PORT = Number(process.env.PORT || 8084);
const APP_BASE_URL = (process.env.APP_BASE_URL || "http://calculatorgaz:3000").replace(/\/+$/, "");
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) { reject(new Error("Payload too large")); req.destroy(); }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function proxy(req, res) {
  const body = req.method === "GET" ? undefined : await readBody(req);
  const response = await fetch(`${APP_BASE_URL}/api/internal/readings${req.url.replace(/^\/readings/, "")}`, {
    method: req.method,
    headers: { "content-type": req.headers["content-type"] || "application/json", "x-internal-api-key": INTERNAL_API_KEY },
    ...(body === undefined ? {} : { body })
  });
  res.writeHead(response.status, { "Content-Type": response.headers.get("content-type") || "application/json" });
  res.end(await response.text());
}

http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") { res.writeHead(200, { "Content-Type": "application/json" }); res.end('{"ok":true}'); return; }
  if (["GET", "POST", "PATCH", "DELETE"].includes(req.method) && req.url.startsWith("/readings")) {
    try { await proxy(req, res); } catch (error) { res.writeHead(502, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: error.message || "Upstream unavailable" })); }
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" }); res.end('{"error":"Not found"}');
}).listen(PORT, "0.0.0.0", () => console.log(`reading-service listening on ${PORT}`));
